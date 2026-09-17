import { buildSeed, EVENT_ID, type SeedData } from "../data/seed";
import { TICKET_TYPES, formatTicketId, typeFromTicketId } from "../domain/catalog";
import { decodeQrPayload, issueQrToken, newNonce } from "./qr-token";
import { normalisePhone } from "../domain/schemas";
import type {
  AclEvent, AclNotification, Agent, Attendee, CheckIn, EventTable, Payment,
  PaymentMethod, PaymentStatus, RejectionReason, SalesChannel, SecurityEvent,
  SecurityEventKind, SecuritySeverity, Ticket, TicketTypeCode, User,
  ValidationOutcome,
} from "../domain/types";

/**
 * In-memory implementation of the ACL data layer.
 *
 * This is the demo adapter. Every method here maps 1:1 onto a Prisma call
 * against the schema in `prisma/schema.prisma` — see `checkIn` in particular,
 * which is written so the swap to a real `SELECT ... FOR UPDATE` transaction
 * changes the body of one function and nothing else.
 */

const METHOD_TO_CHANNEL: Record<PaymentMethod, SalesChannel> = {
  CARD: "WEBSITE",
  BANK_TRANSFER: "BANK_TRANSFER",
  USSD: "USSD",
  POS_AGENT: "POS_AGENT",
  CASH_OUTLET: "CASH",
};

/** Human copy for every rejection path. The gate never sees a bare "invalid". */
const REJECTION_COPY: Record<RejectionReason, { headline: string; message: string }> = {
  TICKET_NOT_FOUND: {
    headline: "TICKET DOES NOT EXIST",
    message: "No ticket with this reference has ever been issued by ACL. Treat as a forgery and hold the holder for security.",
  },
  PAYMENT_PENDING: {
    headline: "PAYMENT PENDING",
    message: "This ticket was reserved but payment has not settled. Send the holder to the payment desk to complete it.",
  },
  PAYMENT_FAILED: {
    headline: "PAYMENT FAILED",
    message: "The transaction for this ticket failed and was never collected. No admission until payment is completed.",
  },
  TICKET_REFUNDED: {
    headline: "TICKET REFUNDED",
    message: "This ticket was refunded and is no longer admissible. The holder has already been paid back.",
  },
  WRONG_EVENT: {
    headline: "WRONG EVENT",
    message: "This ticket belongs to a different ACL event. It cannot be used at tonight's gate.",
  },
  TICKET_EXPIRED: {
    headline: "TICKET EXPIRED",
    message: "Entry for this event has closed. This ticket is no longer valid for admission.",
  },
  ALREADY_USED: {
    headline: "DUPLICATE SCAN ATTEMPT",
    message: "This ticket has already been used to enter the arena. A second entry is never granted.",
  },
  TICKET_SUSPENDED: {
    headline: "TICKET SUSPENDED",
    message: "Security suspended this ticket. Do not admit — escalate to the security lead.",
  },
  TICKET_CANCELLED: {
    headline: "TICKET CANCELLED",
    message: "This ticket was cancelled by ACL operations and carries no admission rights.",
  },
  INVALID_SIGNATURE: {
    headline: "FORGED QR CODE",
    message: "The QR signature does not verify. This code was edited or generated outside ACL. Hold for security.",
  },
  MALFORMED_PAYLOAD: {
    headline: "UNREADABLE CODE",
    message: "This code is not an ACL ticket. Ask the holder for their original e-ticket or use manual entry.",
  },
  EVENT_NOT_OPEN: {
    headline: "GATES CLOSED",
    message: "The gates are not open for scanning. Check event status in Event Settings before admitting anyone.",
  },
};

const SECURITY_KIND: Partial<Record<RejectionReason, SecurityEventKind>> = {
  ALREADY_USED: "DUPLICATE_SCAN",
  TICKET_NOT_FOUND: "INVALID_TICKET",
  PAYMENT_PENDING: "UNPAID_TICKET",
  PAYMENT_FAILED: "UNPAID_TICKET",
  TICKET_REFUNDED: "REFUNDED_TICKET",
  WRONG_EVENT: "WRONG_EVENT",
  TICKET_SUSPENDED: "SUSPENDED_TICKET",
  INVALID_SIGNATURE: "FORGED_PAYLOAD",
  MALFORMED_PAYLOAD: "FORGED_PAYLOAD",
};

const SECURITY_SEVERITY: Partial<Record<RejectionReason, SecuritySeverity>> = {
  ALREADY_USED: "CRITICAL",
  TICKET_SUSPENDED: "CRITICAL",
  INVALID_SIGNATURE: "CRITICAL",
  TICKET_NOT_FOUND: "HIGH",
  WRONG_EVENT: "HIGH",
  TICKET_REFUNDED: "HIGH",
  MALFORMED_PAYLOAD: "HIGH",
  PAYMENT_PENDING: "MEDIUM",
  PAYMENT_FAILED: "MEDIUM",
  TICKET_EXPIRED: "MEDIUM",
  TICKET_CANCELLED: "MEDIUM",
  EVENT_NOT_OPEN: "INFO",
};

export interface ScanRequest {
  payload: string;
  gateId: string;
  operatorId: string;
  deviceId: string;
  source?: "CAMERA" | "MANUAL";
}

export class AclStore {
  private data: SeedData;
  private seq = 0;
  /** Per-ticket promise chain — the in-memory stand-in for row-level locking. */
  private locks = new Map<string, Promise<unknown>>();
  private listeners = new Set<() => void>();

  constructor(now: number = Date.now()) {
    this.data = buildSeed(now);
  }

  // ---- reads ------------------------------------------------------------
  get event(): AclEvent {
    return this.data.event;
  }
  get events(): AclEvent[] {
    return [this.data.event, this.data.altEvent];
  }
  get users(): User[] {
    return this.data.users;
  }
  get agents(): Agent[] {
    return this.data.agents;
  }
  get tables(): EventTable[] {
    return this.data.tables;
  }
  get notifications(): AclNotification[] {
    return [...this.data.notifications].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }
  get securityEvents(): SecurityEvent[] {
    return this.data.securityEvents;
  }

  /** Tickets are always read event-scoped — cross-event totals are a bug. */
  tickets(eventId: string = EVENT_ID): Ticket[] {
    return this.data.tickets.filter((t) => t.eventId === eventId);
  }
  allTickets(): Ticket[] {
    return this.data.tickets;
  }
  ticket(id: string): Ticket | undefined {
    return this.data.tickets.find((t) => t.id === id.toUpperCase());
  }
  attendee(id: string): Attendee | undefined {
    return this.data.attendees.find((a) => a.id === id);
  }
  attendees(): Attendee[] {
    return this.data.attendees;
  }
  payments(eventId: string = EVENT_ID): Payment[] {
    const ids = new Set(this.tickets(eventId).map((t) => t.id));
    return this.data.payments.filter((p) => p.ticketIds.some((t) => ids.has(t)));
  }
  payment(id: string): Payment | undefined {
    return this.data.payments.find((p) => p.id === id);
  }
  checkIns(eventId: string = EVENT_ID): CheckIn[] {
    return this.data.checkIns.filter((c) => c.eventId === eventId);
  }
  gate(id: string) {
    return this.data.event.gates.find((g) => g.id === id);
  }
  user(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  /** The signed payload burned into a ticket's QR image. */
  qrToken(ticketId: string): string | undefined {
    const ticket = this.ticket(ticketId);
    if (!ticket) return undefined;
    const n = this.data.nonces[ticket.id] ?? newNonce();
    this.data.nonces[ticket.id] = n;
    return issueQrToken(ticket.id, ticket.eventId, n);
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit() {
    this.listeners.forEach((l) => l());
  }

  // ---- locking ----------------------------------------------------------
  /**
   * Serialises work per ticket ID.
   *
   * In PostgreSQL this is `SELECT ... FROM tickets WHERE id = $1 FOR UPDATE`
   * inside the check-in transaction: concurrent scanners queue on the row
   * instead of both reading `status = 'VALID'`.
   */
  private async withTicketLock<T>(ticketId: string, fn: () => Promise<T> | T): Promise<T> {
    const previous = this.locks.get(ticketId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(ticketId, previous.then(() => gate));
    await previous;
    try {
      return await fn();
    } finally {
      release();
      // Drop the chain once nothing else is queued behind it.
      queueMicrotask(() => {
        if (this.locks.get(ticketId) === previous.then(() => gate)) this.locks.delete(ticketId);
      });
    }
  }

  // ---- check-in ---------------------------------------------------------
  /**
   * The only path that can admit anyone.
   *
   * Nothing inside the QR payload is trusted: the signature is verified purely
   * to reject tampering cheaply, then the live ticket row is re-read and every
   * rule is applied against *that*. The state transition at the end is a
   * compare-and-set — the same guarantee as
   * `UPDATE tickets SET status='USED' WHERE id=$1 AND status='VALID'`, where a
   * zero row count means another scanner won the race.
   */
  async checkIn(req: ScanRequest): Promise<ValidationOutcome> {
    const started = Date.now();
    const gate = this.gate(req.gateId) ?? this.data.event.gates[0];
    const operator = this.user(req.operatorId) ?? this.data.users[0];
    const decoded = decodeQrPayload(req.payload);

    const reject = (
      reason: RejectionReason,
      ticketId: string,
      detailOverride?: string,
      ticket?: Ticket,
      duplicate?: ValidationOutcome["duplicate"],
    ): ValidationOutcome => {
      const copy = REJECTION_COPY[reason];
      const at = new Date().toISOString();
      const checkIn: CheckIn = {
        id: `chk-${++this.seq}-${Date.now()}`,
        ticketId,
        eventId: this.data.event.id,
        attendeeName: ticket?.attendeeName ?? "Unknown",
        ticketType: ticket?.type ?? "UNKNOWN",
        gateId: gate.id,
        gateName: gate.name,
        operatorId: operator.id,
        operatorName: operator.name,
        deviceId: req.deviceId,
        scannedAt: at,
        result: "REJECTED",
        reason,
        durationMs: Math.max(1, Date.now() - started),
      };
      this.data.checkIns.unshift(checkIn);

      const kind = SECURITY_KIND[reason];
      let securityEvent: SecurityEvent | undefined;
      if (kind) {
        securityEvent = {
          id: `sec-${++this.seq}-${Date.now()}`,
          kind,
          severity: SECURITY_SEVERITY[reason] ?? "MEDIUM",
          ticketId,
          eventId: this.data.event.id,
          gateId: gate.id,
          gateName: gate.name,
          operatorId: operator.id,
          operatorName: operator.name,
          deviceId: req.deviceId,
          at,
          result: "REJECTED",
          detail: detailOverride ?? copy.message,
          firstScanAt: duplicate?.firstScanAt,
          firstScanGate: duplicate?.firstScanGate,
          firstScanOperator: duplicate?.firstScanOperator,
        };
        this.data.securityEvents.unshift(securityEvent);
        if (securityEvent.severity === "CRITICAL" || securityEvent.severity === "HIGH") {
          this.pushNotification({
            kind: "SECURITY_ALERT",
            priority: securityEvent.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
            title: copy.headline.toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
            body: `${ticketId} rejected at ${gate.name}. ${securityEvent.detail}`,
            href: "/security",
          });
        }
      }
      this.emit();
      return {
        result: "REJECTED",
        reason,
        headline: copy.headline,
        message: detailOverride ?? copy.message,
        ticket,
        attendee: ticket ? this.attendee(ticket.attendeeId) : undefined,
        checkIn,
        duplicate,
        securityEvent,
        durationMs: checkIn.durationMs,
      };
    };

    // 1. Decode. A payload that imitates an ACL token but fails its signature
    //    never reaches the database.
    if (decoded.kind === "FORGED") {
      return reject("INVALID_SIGNATURE", this.referenceFrom(req.payload), decoded.detail);
    }
    if (decoded.kind === "MALFORMED") {
      return reject("MALFORMED_PAYLOAD", this.referenceFrom(req.payload), decoded.detail);
    }
    const ticketId = decoded.kind === "SIGNED" ? decoded.payload.t.toUpperCase() : decoded.ticketId;

    // 2. Gates open?
    const openness = this.gatesOpen();
    if (!openness.open) {
      return reject("EVENT_NOT_OPEN", ticketId, openness.detail);
    }

    // 3. Everything below runs under the ticket's lock.
    return this.withTicketLock(ticketId, async () => {
      // Re-read the row inside the lock — never reuse a pre-lock snapshot.
      const ticket = this.ticket(ticketId);
      if (!ticket) return reject("TICKET_NOT_FOUND", ticketId);

      if (ticket.eventId !== this.data.event.id) {
        const other = this.events.find((e) => e.id === ticket.eventId);
        return reject(
          "WRONG_EVENT",
          ticketId,
          `Ticket was issued for ${other?.name ?? "another ACL event"}.`,
          ticket,
        );
      }

      // 4. Payment state, straight off the live payment record.
      const payment = this.payment(ticket.paymentId);
      const paymentStatus: PaymentStatus = payment?.status ?? ticket.paymentStatus;
      if (paymentStatus === "PENDING") return reject("PAYMENT_PENDING", ticketId, undefined, ticket);
      if (paymentStatus === "FAILED") return reject("PAYMENT_FAILED", ticketId, undefined, ticket);
      if (paymentStatus === "REFUNDED") return reject("TICKET_REFUNDED", ticketId, undefined, ticket);

      // 5. Ticket lifecycle.
      if (ticket.status === "SUSPENDED") return reject("TICKET_SUSPENDED", ticketId, undefined, ticket);
      if (ticket.status === "CANCELLED") return reject("TICKET_CANCELLED", ticketId, undefined, ticket);
      if (ticket.status === "REFUNDED") return reject("TICKET_REFUNDED", ticketId, undefined, ticket);
      if (ticket.status === "EXPIRED") return reject("TICKET_EXPIRED", ticketId, undefined, ticket);

      // 6. Already used — the duplicate path. Report where and by whom.
      if (ticket.status === "USED") {
        const first = this.data.checkIns.find(
          (c) => c.ticketId === ticket.id && c.result === "GRANTED",
        );
        return reject("ALREADY_USED", ticketId, undefined, ticket, {
          firstScanAt: first?.scannedAt ?? ticket.usedAt ?? new Date().toISOString(),
          firstScanGate: first?.gateName ?? this.gate(ticket.usedGateId ?? "")?.name ?? "Unknown gate",
          firstScanOperator: first?.operatorName ?? this.user(ticket.usedOperatorId ?? "")?.name ?? "Unknown operator",
        });
      }

      // Simulated storage round-trip. Anything that interleaves here is exactly
      // what the compare-and-set below has to survive.
      await Promise.resolve();

      // 7. Compare-and-set. Only a ticket still VALID at this instant is
      //    admitted; the loser of a race falls through to the duplicate path.
      if (ticket.status !== "VALID") {
        const first = this.data.checkIns.find(
          (c) => c.ticketId === ticket.id && c.result === "GRANTED",
        );
        return reject("ALREADY_USED", ticketId, undefined, ticket, {
          firstScanAt: first?.scannedAt ?? new Date().toISOString(),
          firstScanGate: first?.gateName ?? "Unknown gate",
          firstScanOperator: first?.operatorName ?? "Unknown operator",
        });
      }

      const at = new Date().toISOString();
      ticket.status = "USED";
      ticket.usedAt = at;
      ticket.usedGateId = gate.id;
      ticket.usedOperatorId = operator.id;
      ticket.version += 1;

      const checkIn: CheckIn = {
        id: `chk-${++this.seq}-${Date.now()}`,
        ticketId: ticket.id,
        eventId: ticket.eventId,
        attendeeName: ticket.attendeeName,
        ticketType: ticket.type,
        gateId: gate.id,
        gateName: gate.name,
        operatorId: operator.id,
        operatorName: operator.name,
        deviceId: req.deviceId,
        scannedAt: at,
        result: "GRANTED",
        durationMs: Math.max(1, Date.now() - started),
      };
      this.data.checkIns.unshift(checkIn);

      // Table admissions mark the party in.
      const table = this.data.tables.find((t) => t.ticketId === ticket.id);
      if (table) {
        table.guests = table.guests.map((g) => ({ ...g, checkedIn: true, checkedInAt: g.checkedInAt ?? at }));
      }

      this.emit();
      return {
        result: "GRANTED",
        headline: "VALID TICKET",
        message: `Access granted at ${gate.name}.`,
        ticket,
        attendee: this.attendee(ticket.attendeeId),
        checkIn,
        durationMs: checkIn.durationMs,
      };
    });
  }

  /** Best-effort ticket reference for logging an unreadable payload. */
  private referenceFrom(payload: string): string {
    const match = payload.toUpperCase().match(/ACL-[A-Z-]+-\d{3,}/);
    return match ? match[0] : `UNREADABLE:${payload.slice(0, 24)}`;
  }

  gatesOpen(at: number = Date.now()): { open: boolean; detail: string } {
    const event = this.data.event;
    if (event.status === "LIVE") return { open: true, detail: "Gates are open." };
    if (event.status === "DRAFT") return { open: false, detail: "Event is still a draft. Scanning is disabled." };
    if (event.status === "CANCELLED") return { open: false, detail: "This event was cancelled." };
    if (event.status === "COMPLETED") return { open: false, detail: "This event has finished." };
    const start = Date.parse(event.startsAt);
    const opensAt = start - event.rules.doorsOpenMinutesBefore * 60_000;
    const closesAt = start + event.rules.entryClosesMinutesAfter * 60_000;
    if (at < opensAt) {
      return { open: false, detail: `Doors open ${event.rules.doorsOpenMinutesBefore} minutes before the first bell.` };
    }
    if (at > closesAt) return { open: false, detail: "Entry for this event has closed." };
    return { open: true, detail: "Gates are open." };
  }

  // ---- sales ------------------------------------------------------------
  private nextSequence(type: TicketTypeCode): number {
    const def = TICKET_TYPES[type];
    const prefix = `ACL-${def.idSegment}-`;
    const highest = this.data.tickets
      .filter((t) => t.id.startsWith(prefix))
      .reduce((max, t) => Math.max(max, Number(t.id.slice(prefix.length)) || 0), 0);
    return highest + 1;
  }

  soldByType(type: TicketTypeCode, eventId: string = EVENT_ID): number {
    return this.tickets(eventId).filter((t) => t.type === type && t.paymentStatus !== "FAILED").length;
  }

  remainingByType(type: TicketTypeCode): number {
    return Math.max(0, TICKET_TYPES[type].allocation - this.soldByType(type));
  }

  /**
   * Issue tickets for a completed sale.
   *
   * Ticket IDs are minted here and nowhere else — an agent supplies a customer
   * and a tier, never an identifier.
   */
  sell(input: {
    fullName: string;
    phone: string;
    email: string;
    type: TicketTypeCode;
    quantity: number;
    method: PaymentMethod;
    agentId?: string;
    status?: PaymentStatus;
    tableId?: string;
    guests?: string[];
  }): { payment: Payment; tickets: Ticket[] } {
    const def = TICKET_TYPES[input.type];
    const remaining = this.remainingByType(input.type);
    if (input.quantity > remaining) {
      throw new StoreError(
        `Only ${remaining} ${def.name} ${remaining === 1 ? "ticket is" : "tickets are"} left.`,
      );
    }
    if (input.agentId) {
      const agent = this.data.agents.find((a) => a.id === input.agentId);
      if (!agent) throw new StoreError("Unknown agent.");
      if (agent.status !== "ACTIVE") throw new StoreError(`Agent ${agent.name} is ${agent.status.toLowerCase()} and cannot sell.`);
    }

    const at = new Date().toISOString();
    const attendee: Attendee = {
      id: `att-${++this.seq}-${Date.now()}`,
      name: input.fullName.trim(),
      phone: normalisePhone(input.phone),
      email: input.email.trim().toLowerCase(),
      createdAt: at,
    };
    this.data.attendees.push(attendee);

    const status: PaymentStatus = input.status ?? (input.method === "BANK_TRANSFER" || input.method === "CASH_OUTLET" ? "PENDING" : "PAID");
    const payment: Payment = {
      id: `PAY-${String(this.data.payments.length + 1).padStart(6, "0")}`,
      reference: `ACLPAY${Date.now().toString(36).toUpperCase()}`,
      ticketIds: [],
      attendeeId: attendee.id,
      customerName: attendee.name,
      amount: def.price * input.quantity,
      method: input.method,
      status,
      createdAt: at,
      settledAt: status === "PAID" ? at : undefined,
      agentId: input.agentId,
      providerRef: input.method === "CARD" ? `ps_${Date.now().toString(36)}` : undefined,
    };

    const issued: Ticket[] = [];
    for (let i = 0; i < input.quantity; i++) {
      const id = input.tableId ?? formatTicketId(input.type, this.nextSequence(input.type));
      const ticket: Ticket = {
        id,
        eventId: this.data.event.id,
        type: input.type,
        attendeeId: attendee.id,
        attendeeName: attendee.name,
        price: def.price,
        status: "VALID",
        paymentId: payment.id,
        paymentStatus: status,
        channel: input.agentId ? "POS_AGENT" : METHOD_TO_CHANNEL[input.method],
        agentId: input.agentId,
        tableId: input.tableId,
        purchasedAt: at,
        version: 1,
      };
      this.data.tickets.push(ticket);
      this.data.nonces[ticket.id] = newNonce();
      payment.ticketIds.push(ticket.id);
      issued.push(ticket);
    }
    this.data.payments.push(payment);

    if (input.tableId) {
      const table = this.data.tables.find((t) => t.id === input.tableId);
      if (table) {
        table.buyerName = attendee.name;
        table.buyerPhone = attendee.phone;
        table.ticketId = issued[0]?.id;
        table.paymentStatus = status;
        table.reserved = false;
        table.reservedNote = undefined;
        table.guests = Array.from({ length: table.capacity }, (_, g) => ({
          id: `${table.id}-g${g + 1}`,
          name: input.guests?.[g]?.trim() || (g === 0 ? attendee.name : `Guest ${g + 1}`),
          checkedIn: false,
        }));
      }
    }

    this.pushNotification({
      kind: status === "PAID" ? "PAYMENT_RECEIVED" : "TICKET_SOLD",
      priority: "NORMAL",
      title: status === "PAID" ? "Payment received" : "Ticket reserved",
      body: `${attendee.name} — ${input.quantity} × ${def.name} (${issued.map((t) => t.id).join(", ")}).`,
      href: "/sales",
    });
    this.checkCapacityWarning();
    this.emit();
    return { payment, tickets: issued };
  }

  private checkCapacityWarning() {
    const sold = this.tickets().filter((t) => t.paymentStatus !== "FAILED").length;
    if (sold / this.data.event.capacity >= 0.9) {
      const already = this.data.notifications.some(
        (n) => n.kind === "CAPACITY_WARNING" && Date.now() - Date.parse(n.at) < 3_600_000,
      );
      if (!already) {
        this.pushNotification({
          kind: "CAPACITY_WARNING",
          priority: "HIGH",
          title: "Capacity above 90%",
          body: `${sold} of ${this.data.event.capacity} tickets are committed.`,
          href: "/seating",
        });
      }
    }
  }

  refund(ticketId: string, reason: string, actor: string): Ticket {
    const ticket = this.ticket(ticketId);
    if (!ticket) throw new StoreError("Ticket not found.");
    if (ticket.paymentStatus === "REFUNDED") throw new StoreError("This ticket has already been refunded.");
    if (ticket.status === "USED") throw new StoreError("This ticket has already been used for entry and cannot be refunded here.");
    const payment = this.payment(ticket.paymentId);
    if (payment) {
      // A multi-ticket order refunds only the line being cancelled.
      if (payment.ticketIds.length === 1) {
        payment.status = "REFUNDED";
        payment.refundedAt = new Date().toISOString();
      }
      payment.amount = Math.max(0, payment.amount - ticket.price);
    }
    ticket.paymentStatus = "REFUNDED";
    ticket.status = "REFUNDED";
    ticket.version += 1;

    const table = this.data.tables.find((t) => t.ticketId === ticket.id);
    if (table) {
      table.buyerName = undefined;
      table.buyerPhone = undefined;
      table.ticketId = undefined;
      table.paymentStatus = undefined;
      table.guests = [];
    }

    this.pushNotification({
      kind: "REFUND",
      priority: "NORMAL",
      title: "Refund processed",
      body: `${ticket.attendeeName} refunded ₦${ticket.price.toLocaleString("en-NG")} — ${ticket.id}. Reason: ${reason} (by ${actor}).`,
      href: "/payments",
    });
    this.emit();
    return ticket;
  }

  updateAttendee(id: string, patch: { name: string; phone: string; email: string }): Attendee {
    const attendee = this.attendee(id);
    if (!attendee) throw new StoreError("Attendee not found.");
    attendee.name = patch.name.trim();
    attendee.phone = normalisePhone(patch.phone);
    attendee.email = patch.email.trim().toLowerCase();
    this.data.tickets
      .filter((t) => t.attendeeId === id)
      .forEach((t) => {
        t.attendeeName = attendee.name;
      });
    this.data.payments
      .filter((p) => p.attendeeId === id)
      .forEach((p) => {
        p.customerName = attendee.name;
      });
    this.emit();
    return attendee;
  }

  suspendTicket(ticketId: string, note: string): Ticket {
    const ticket = this.ticket(ticketId);
    if (!ticket) throw new StoreError("Ticket not found.");
    if (ticket.status === "USED") throw new StoreError("Ticket has already been used.");
    ticket.status = ticket.status === "SUSPENDED" ? "VALID" : "SUSPENDED";
    ticket.version += 1;
    this.pushNotification({
      kind: "SECURITY_ALERT",
      priority: "HIGH",
      title: ticket.status === "SUSPENDED" ? "Ticket suspended" : "Ticket reinstated",
      body: `${ticket.id} — ${note}`,
      href: "/security",
    });
    this.emit();
    return ticket;
  }

  /**
   * Delivery of the e-ticket. In production this hands off to the messaging
   * provider; here it records the intent so the operator sees it happened.
   */
  resendTicket(ticketId: string, via: "EMAIL" | "SMS" | "WHATSAPP"): { to: string } {
    const ticket = this.ticket(ticketId);
    if (!ticket) throw new StoreError("Ticket not found.");
    const attendee = this.attendee(ticket.attendeeId);
    const to = via === "EMAIL" ? attendee?.email ?? "" : attendee?.phone ?? "";
    this.pushNotification({
      kind: "SYSTEM",
      priority: "NORMAL",
      title: "E-ticket sent",
      body: `${ticket.id} re-sent to ${to} via ${via.toLowerCase()}.`,
      href: "/attendees",
    });
    this.emit();
    return { to };
  }

  // ---- tables & seating -------------------------------------------------
  reserveTable(tableId: string, note: string): EventTable {
    const table = this.data.tables.find((t) => t.id === tableId);
    if (!table) throw new StoreError("Table not found.");
    if (table.ticketId) throw new StoreError("This table is already sold.");
    table.reserved = !table.reserved;
    table.reservedNote = table.reserved ? note : undefined;
    this.emit();
    return table;
  }

  // ---- agents -----------------------------------------------------------
  createAgent(input: { name: string; phone: string; location: string; commissionRate: number }): Agent {
    const agent: Agent = {
      id: `AGT-${String(this.data.agents.length + 1).padStart(3, "0")}`,
      name: input.name.trim(),
      phone: normalisePhone(input.phone),
      location: input.location.trim(),
      commissionRate: input.commissionRate,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    };
    this.data.agents.push(agent);
    this.emit();
    return agent;
  }

  setAgentStatus(agentId: string, status: Agent["status"]): Agent {
    const agent = this.data.agents.find((a) => a.id === agentId);
    if (!agent) throw new StoreError("Agent not found.");
    agent.status = status;
    this.emit();
    return agent;
  }

  // ---- notifications ----------------------------------------------------
  pushNotification(input: Omit<AclNotification, "id" | "at" | "read">): AclNotification {
    const notification: AclNotification = {
      ...input,
      id: `ntf-${++this.seq}-${Date.now()}`,
      at: new Date().toISOString(),
      read: false,
    };
    this.data.notifications.unshift(notification);
    if (this.data.notifications.length > 60) this.data.notifications.length = 60;
    return notification;
  }

  markNotificationsRead(ids?: string[]): void {
    this.data.notifications.forEach((n) => {
      if (!ids || ids.includes(n.id)) n.read = true;
    });
    this.emit();
  }

  // ---- settings ---------------------------------------------------------
  updateEvent(patch: Partial<AclEvent> & { prices?: Record<string, number> }): AclEvent {
    const { prices, ...rest } = patch;
    Object.assign(this.data.event, rest);
    if (prices) {
      for (const [code, price] of Object.entries(prices)) {
        const def = TICKET_TYPES[code as TicketTypeCode];
        if (def && Number.isFinite(price)) def.price = price;
      }
    }
    this.emit();
    return this.data.event;
  }
}

export class StoreError extends Error {}

/** Survives Next.js dev-server hot reloads so demo state is not lost mid-shift. */
const globalRef = globalThis as unknown as { __aclStore?: AclStore };

export function getStore(): AclStore {
  if (!globalRef.__aclStore) globalRef.__aclStore = new AclStore();
  return globalRef.__aclStore;
}

export { EVENT_ID, typeFromTicketId };
