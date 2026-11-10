/**
 * The check-in transaction.
 *
 * SECURITY CONTRACT
 *  - The server-side ticket record is the only source of truth. The QR payload
 *    is used to *find* a ticket and to prove the code was issued by us; nothing
 *    in it (type, price, paid flag) is ever believed.
 *  - A ticket admits exactly once. `validateAndAdmit` reads the ticket and marks
 *    it USED with no await in between, so on this single-process demo store two
 *    devices racing on the same ticket are serialised by the event loop and
 *    exactly one receives GRANTED.
 *  - Every attempt — granted or not — is appended to the audit log.
 *
 * With PostgreSQL the same guarantee comes from a conditional update inside a
 * transaction (see README, "Atomic check-in"):
 *
 *   UPDATE "Ticket" SET status = 'USED', "checkedInAt" = now()
 *    WHERE id = $1 AND status = 'ACTIVE' RETURNING id;
 *
 * Zero rows returned means another device won the race → DUPLICATE.
 */
import { REASON_LABEL, time } from "@/lib/format";
import type { CheckIn, ScanMode, ScanOutcome, ScanReason, Severity, Ticket, User } from "@/lib/types";
import { nowIso, nowMs } from "./clock";
import { parsePayload } from "./qr";
import { db, touch } from "./store";
import { notify } from "./notify";

export interface ScanInput {
  payload: string;
  gateId: string;
  deviceId: string;
  mode: ScanMode;
  durationMs?: number;
}

const SEVERITY: Record<Exclude<ScanReason, "OK">, Severity> = {
  DUPLICATE: "CRITICAL",
  TAMPERED_QR: "CRITICAL",
  SUSPENDED: "CRITICAL",
  UNSIGNED_QR: "WARNING",
  NOT_FOUND: "WARNING",
  WRONG_EVENT: "WARNING",
  PAYMENT_PENDING: "WARNING",
  PAYMENT_FAILED: "WARNING",
  REFUNDED: "WARNING",
  CANCELLED: "WARNING",
  EVENT_ENDED: "INFO",
  WRONG_GATE: "INFO",
  MALFORMED: "INFO",
};

const EVENT_TITLE: Partial<Record<ScanReason, string>> = {
  DUPLICATE: "Duplicate QR attempt",
  NOT_FOUND: "Invalid ticket",
  TAMPERED_QR: "Tampered QR code",
  UNSIGNED_QR: "Unsigned QR code",
  PAYMENT_PENDING: "Unpaid ticket presented",
  PAYMENT_FAILED: "Unpaid ticket presented",
  REFUNDED: "Refunded ticket presented",
  WRONG_EVENT: "Ticket from another event",
  SUSPENDED: "Suspended ticket presented",
};

export function validateAndAdmit(input: ScanInput, operator: User): ScanOutcome {
  const d = db();
  const gate = d.gates.find((g) => g.id === input.gateId);
  if (!gate) throw new Error("Unknown gate");
  if (!gate.active) throw new Error(`${gate.name} is closed. Select an open gate.`);
  const at = nowIso();
  const parsed = parsePayload(input.payload);
  const presented = input.payload.trim().slice(0, 96);

  let ticket: Ticket | undefined;
  let reason: ScanReason = "OK";
  let message = "";
  let redirectTo: string | undefined;
  let firstScan: ScanOutcome["firstScan"];
  const gateName = (id: string) => d.gates.find((g) => g.id === id)?.name ?? id;
  const userName = (id: string) => d.users.find((u) => u.id === id)?.name ?? id;

  decide: {
    // 1. Decode — is this something we could have issued?
    if (parsed.kind === "malformed") {
      reason = "MALFORMED"; message = "This code is not an ACL ticket. Ask for the original e-ticket."; break decide;
    }
    if (parsed.kind === "tampered") {
      ticket = d.tickets.find((t) => t.id === parsed.claimedTicketId);
      reason = "TAMPERED_QR"; message = "QR signature does not match. The code was altered or forged — do not admit."; break decide;
    }
    if (parsed.kind === "raw" && input.mode === "QR" && d.event.rules.requireSignedQr) {
      ticket = d.tickets.find((t) => t.id === parsed.ticketId);
      reason = "UNSIGNED_QR"; message = "This QR was not issued by ACL (no signature). Genuine e-tickets are signed — verify ID and use manual entry if legitimate."; break decide;
    }
    // 2. Find the ticket record.
    ticket = d.tickets.find((t) => t.id === parsed.ticketId);
    if (!ticket) { reason = "NOT_FOUND"; message = "No ticket with this ID has ever been issued."; break decide; }
    // 3. Right event? (Checked against the record, and against the signed claim.)
    if (ticket.eventId !== d.event.id || (parsed.kind === "signed" && parsed.eventId !== ticket.eventId)) {
      const other = d.otherEvents.find((e) => e.id === ticket!.eventId);
      reason = "WRONG_EVENT"; message = `This ticket belongs to ${other?.name ?? "a different event"}, not ${d.event.name}.`; break decide;
    }
    if (nowMs() > Date.parse(d.event.endsAt)) {
      reason = "EVENT_ENDED"; message = "This event has ended. The ticket has expired."; break decide;
    }
    // 4. Payment status.
    const payment = d.payments.find((p) => p.id === ticket!.paymentId);
    if (!payment || payment.status === "FAILED") { reason = "PAYMENT_FAILED"; message = "Payment for this ticket failed. No valid purchase exists."; break decide; }
    if (payment.status === "PENDING") { reason = "PAYMENT_PENDING"; message = "Payment has not been confirmed yet. Direct the guest to the box office."; break decide; }
    if (payment.status === "REFUNDED" || ticket.status === "REFUNDED") { reason = "REFUNDED"; message = "This ticket was refunded and is no longer valid."; break decide; }
    // 5. Ticket status.
    if (ticket.status === "VOID") { reason = "CANCELLED"; message = "This ticket was cancelled."; break decide; }
    if (ticket.status === "SUSPENDED") { reason = "SUSPENDED"; message = `Ticket suspended: ${ticket.suspendedReason ?? "contact the event manager"}.`; break decide; }
    // 6. Already used? A ticket admits once — no exceptions.
    if (ticket.status === "USED") {
      const first = d.checkIns.find((c) => c.id === ticket!.checkInId);
      if (first) firstScan = { at: first.at, gateName: gateName(first.gateId), operatorName: userName(first.operatorId), deviceId: first.deviceId };
      reason = "DUPLICATE";
      message = first ? `Ticket already used at ${gateName(first.gateId)}, ${time(first.at)}.` : "Ticket already used.";
      break decide;
    }
    // 7. Ticket type vs gate.
    if (!gate.allowedTypes.includes(ticket.typeId)) {
      const type = d.ticketTypes.find((t) => t.id === ticket!.typeId)!;
      redirectTo = d.gates.find((g) => g.active && g.allowedTypes.includes(ticket!.typeId))?.name;
      reason = "WRONG_GATE"; message = `${type.name} tickets are not admitted at ${gate.name}.${redirectTo ? ` Redirect to ${redirectTo}.` : ""} Ticket has not been used.`; break decide;
    }
    message = "Access granted";
  }

  // 8–10. Record the attempt and, if valid, consume the ticket — same tick, no awaits.
  const checkIn: CheckIn = {
    id: `scan_${String(++d.seq.scan).padStart(5, "0")}`,
    eventId: d.event.id,
    ticketId: ticket?.id,
    presented,
    result: reason === "OK" ? "GRANTED" : "REJECTED",
    reason, message, mode: input.mode,
    gateId: gate.id, operatorId: operator.id, deviceId: input.deviceId,
    durationMs: input.durationMs, at,
  };
  d.checkIns.push(checkIn);

  if (reason === "OK" && ticket) {
    ticket.status = "USED";
    ticket.checkedInAt = at;
    ticket.checkInId = checkIn.id;
  } else {
    const severity = SEVERITY[reason as Exclude<ScanReason, "OK">];
    const ref = ticket?.id ?? (parsed.kind === "raw" ? parsed.ticketId : presented.slice(0, 40));
    d.securityEvents.push({
      id: `sec_${String(++d.seq.sec).padStart(4, "0")}`, eventId: d.event.id, checkInId: checkIn.id, type: reason, severity,
      title: EVENT_TITLE[reason] ?? REASON_LABEL[reason], detail: message, ticketRef: ref,
      gateId: gate.id, operatorId: operator.id, deviceId: input.deviceId, at,
    });
    if (severity === "CRITICAL") {
      notify("SECURITY", "CRITICAL", reason === "DUPLICATE" ? "Duplicate QR scan" : EVENT_TITLE[reason] ?? "Security alert", `${ref} rejected at ${gate.name}. ${message}`, ticket?.id);
    }
    // Pattern alert: one device producing a burst of rejections is worth a supervisor's attention.
    const since = nowMs() - 2 * 60_000;
    const burst = d.checkIns.filter((c) => c.deviceId === input.deviceId && c.result === "REJECTED" && c.reason !== "WRONG_GATE" && Date.parse(c.at) >= since).length;
    if (burst === 5) notify("SECURITY", "CRITICAL", "Repeated rejected scans", `Device ${input.deviceId} at ${gate.name} has rejected 5 tickets in 2 minutes. Send a supervisor.`);
  }
  touch();

  const type = ticket && d.ticketTypes.find((t) => t.id === ticket!.typeId);
  const sameEvent = ticket?.eventId === d.event.id;
  return {
    checkIn,
    gateName: gate.name,
    operatorName: operator.name,
    firstScan,
    redirectTo,
    // Details are only disclosed for tickets of this event.
    ticket: ticket && sameEvent && type ? {
      id: ticket.id,
      typeName: type.name,
      pricePaid: ticket.pricePaid,
      attendeeName: d.attendees.find((a) => a.id === ticket!.attendeeId)?.name ?? "Unknown",
      paymentStatus: d.payments.find((p) => p.id === ticket!.paymentId)?.status ?? "FAILED",
      status: ticket.status,
      seatLabel: d.seats.find((s) => s.id === ticket!.seatId)?.label,
      tableLabel: d.tables.find((t) => t.id === ticket!.tableId)?.label,
    } : undefined,
  };
}
