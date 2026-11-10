import type { DemoKitItem, Snapshot, User } from "@/lib/types";
import { isDemoClock, nowIso } from "./clock";
import { issueQrToken } from "./qr";
import { db } from "./store";

/** Read model for the UI: everything for the current event, plus who is asking. */
export function buildSnapshot(user: User): Snapshot {
  const d = db();
  const mine = <T extends { eventId: string }>(rows: T[]) => rows.filter((r) => r.eventId === d.event.id);
  const tickets = mine(d.tickets);
  const attendeeIds = new Set(tickets.map((t) => t.attendeeId));
  return {
    version: d.version,
    now: nowIso(),
    demo: isDemoClock(),
    currentUser: user,
    permissions: d.rolePermissions[user.role],
    event: d.event,
    ticketTypes: d.ticketTypes,
    tickets,
    attendees: d.attendees.filter((a) => attendeeIds.has(a.id)),
    payments: mine(d.payments),
    checkIns: d.checkIns,
    securityEvents: d.securityEvents,
    gates: d.gates,
    seats: d.seats,
    tables: d.tables,
    agents: d.agents,
    notifications: d.notifications,
    promoCodes: d.promoCodes,
    messages: d.messages,
    users: d.users,
    rolePermissions: d.rolePermissions,
    demoKit: demoKit(),
  };
}

function demoKit(): DemoKitItem[] {
  const d = db();
  const pay = (id: string) => d.payments.find((p) => p.id === id)?.status;
  const mine = d.tickets.filter((t) => t.eventId === d.event.id);
  const kit: DemoKitItem[] = [];
  const add = (label: string, expect: string, t?: { id: string; qrToken: string }) => { if (t) kit.push({ label, expect, ticketId: t.id, payload: t.qrToken }); };
  add("Valid, unused", "ACCESS GRANTED", mine.find((t) => t.status === "ACTIVE" && pay(t.paymentId) === "PAID" && t.typeId === "GEN"));
  add("Valid VIP", "ACCESS GRANTED", mine.find((t) => t.status === "ACTIVE" && pay(t.paymentId) === "PAID" && t.typeId === "VIP"));
  add("Already used", "DUPLICATE SCAN", mine.find((t) => t.id === "ACL-GEN-000398") ?? mine.find((t) => t.status === "USED"));
  add("Payment pending", "DENIED · unpaid", mine.find((t) => t.status === "ACTIVE" && pay(t.paymentId) === "PENDING"));
  add("Refunded", "DENIED · refunded", mine.find((t) => t.status === "REFUNDED"));
  add("Suspended", "DENIED · suspended", mine.find((t) => t.status === "SUSPENDED"));
  add("Another event", "DENIED · wrong event", d.tickets.find((t) => t.eventId !== d.event.id));
  const forged = issueQrToken(d.event.id, "ACL-RNG-000118");
  kit.push({ label: "Forged signature", expect: "DENIED · tampered", ticketId: "ACL-RNG-000118", payload: forged.slice(0, -4) + (forged.endsWith("AAAA") ? "BBBB" : "AAAA") });
  kit.push({ label: "Fake ticket ID", expect: "DENIED · does not exist", ticketId: "ACL-VIP-009821", payload: issueQrToken(d.event.id, "ACL-VIP-009821") });
  return kit;
}
