/**
 * Every state change in ACL EVENT OS is one of these actions.
 * Each declares the permission it needs; the API route validates input with
 * Zod, checks the caller's role, then runs the handler. Handlers are
 * synchronous on the demo store, i.e. each behaves as one transaction.
 */
import type { z } from "zod";
import { METHOD_LABEL, naira } from "@/lib/format";
import { ALL_PERMISSIONS } from "@/lib/permissions";
import { actionSchemas, type ActionName } from "@/lib/schemas";
import type { Payment, Permission, Ticket, TicketType, User } from "@/lib/types";
import { validateAndAdmit } from "./checkin";
import { nowIso, nowMs } from "./clock";
import { notify } from "./notify";
import { getPaymentProvider } from "./payments";
import { issueQrToken } from "./qr";
import { ticketId as formatTicketId } from "./seed";
import { db, resetDb, touch } from "./store";

export class ActionError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

type Handler<A extends ActionName> = (input: z.output<(typeof actionSchemas)[A]>, user: User) => unknown;
type ActionDef<A extends ActionName> = { permission: Permission | null; run: Handler<A> };

const fail = (msg: string, status = 400): never => { throw new ActionError(msg, status); };
const ticketOf = (id: string) => db().tickets.find((t) => t.id === id && t.eventId === db().event.id) ?? fail("Ticket not found", 404);
const paymentOf = (id: string) => db().payments.find((p) => p.id === id && p.eventId === db().event.id) ?? fail("Payment not found", 404);
const typeOf = (id: string) => db().ticketTypes.find((t) => t.id === id) ?? fail("Unknown ticket type", 404);
const randomRef = () => `ACLPAY-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;

function releaseSeats(tickets: Ticket[]) {
  const d = db();
  for (const t of tickets) {
    const seat = d.seats.find((s) => s.id === t.seatId);
    if (seat && seat.ticketId === t.id) { seat.status = "AVAILABLE"; seat.ticketId = undefined; }
    const table = d.tables.find((x) => x.id === t.tableId);
    if (table && table.ticketId === t.id) { table.ticketId = undefined; table.buyer = undefined; table.guests = []; }
  }
}

function capacityCheck(type: TicketType) {
  const d = db();
  const section = d.seats.filter((s) => s.typeId === type.id);
  const left = section.filter((s) => s.status === "AVAILABLE").length;
  const share = 1 - left / section.length;
  if (left === 0) notify("CAPACITY", "WARNING", "Sold out", `${type.name} has no inventory left.`);
  else if (share >= 0.9 && (section.length - left - 1) / section.length < 0.9) notify("CAPACITY", "WARNING", "Capacity warning", `${type.name} is 90% allocated — ${left} left.`);
}

const actions: { [A in ActionName]: ActionDef<A> } = {
  "checkin.scan": { permission: "checkin.scan", run: (input, user) => validateAndAdmit(input, user) },

  "tickets.purchase": {
    permission: "tickets.sell",
    run: (input, user) => {
      const d = db();
      const type = typeOf(input.typeId);
      if (!d.event.rules.salesOpen) fail("Ticket sales are closed for this event.");
      if (nowMs() > Date.parse(d.event.endsAt)) fail("This event has ended.");
      const quantity = type.isTable ? 1 : input.quantity;
      if (quantity > d.event.rules.maxPerOrder) fail(`Maximum ${d.event.rules.maxPerOrder} tickets per order.`);

      // Agents sell under their own ID only; nobody else can attribute a sale to an agent that is not active.
      let method = input.method;
      let agentId: string | undefined;
      if (user.agentId) { method = "POS_AGENT"; agentId = user.agentId; }
      else if (method === "POS_AGENT") agentId = input.agentId ?? fail("Select the agent who made this sale.");
      if (agentId) {
        const agent = d.agents.find((a) => a.id === agentId) ?? fail("Unknown agent.");
        if (agent.status !== "ACTIVE") fail(`Agent ${agent.id} is suspended and cannot sell tickets.`);
      }

      const free = d.seats.filter((s) => s.typeId === type.id && s.status === "AVAILABLE");
      let chosen = free.slice(0, quantity);
      if (type.isTable && input.tableId) {
        const seat = free.find((s) => s.id === input.tableId) ?? fail("That table is no longer available.");
        chosen = [seat];
      }
      if (chosen.length < quantity) fail(free.length === 0 ? `${type.name} is sold out.` : `Only ${free.length} ${type.name} left.`);

      let unit = type.price;
      let promo = undefined as (typeof d.promoCodes)[number] | undefined;
      if (input.promoCode) {
        promo = d.promoCodes.find((p) => p.code === input.promoCode);
        if (!promo || !promo.active) fail("Promo code is not valid.");
        if (promo!.uses + 1 > promo!.maxUses) fail("Promo code has been fully redeemed.");
        unit = Math.round(type.price * (1 - promo!.percentOff / 100));
      }
      const amount = unit * quantity;
      const reference = randomRef();
      const charge = getPaymentProvider().charge({ amount, currency: "NGN", method, reference, customer: { name: input.name, email: input.email, phone: input.phone }, simulateDecline: method === "CARD" && input.simulateDecline });

      const at = nowIso();
      const attendee = { id: `att_${String(++d.seq.att).padStart(4, "0")}`, name: input.name, phone: input.phone, email: input.email, createdAt: at };
      d.attendees.push(attendee);
      const payment: Payment = {
        id: `TXN-${String(d.seq.txn++).padStart(6, "0")}`, eventId: d.event.id, ticketIds: [], attendeeId: attendee.id, amount, method,
        status: charge.status, reference, provider: charge.provider, agentId, createdAt: at,
        paidAt: charge.status === "PAID" ? at : undefined, failureReason: charge.failureReason,
      };
      const tickets: Ticket[] = [];
      for (let i = 0; i < quantity; i++) {
        // Ticket IDs come from a server-side sequence. Clients never supply them.
        const id = formatTicketId(type, d.seq.serial[type.id]++);
        const seat = charge.status === "FAILED" ? undefined : chosen[i];
        if (seat) { seat.status = "SOLD"; seat.ticketId = id; seat.reservedFor = undefined; }
        const table = seat && type.isTable ? d.tables.find((t) => t.seatId === seat.id) : undefined;
        if (table) { table.ticketId = id; table.buyer = input.name; table.guests = input.guests ?? []; }
        tickets.push({
          id, eventId: d.event.id, typeId: type.id, attendeeId: attendee.id, paymentId: payment.id,
          status: charge.status === "FAILED" ? "VOID" : "ACTIVE", pricePaid: unit, seatId: seat?.id, tableId: table?.id,
          agentId, promoCode: promo?.code, qrToken: issueQrToken(d.event.id, id), createdAt: at,
        });
      }
      payment.ticketIds = tickets.map((t) => t.id);
      d.payments.push(payment);
      d.tickets.push(...tickets);

      const label = `${tickets[0].id}${quantity > 1 ? ` +${quantity - 1}` : ""} · ${type.name} · ${naira(amount)}`;
      if (charge.status === "PAID") {
        if (promo) promo.uses += 1;
        notify("SALE", "INFO", "New ticket sold", `${label} via ${agentId ? `agent ${agentId}` : METHOD_LABEL[method]}`, tickets[0].id);
        capacityCheck(type);
      } else if (charge.status === "PENDING") {
        if (promo) promo.uses += 1;
        notify("PAYMENT", "INFO", "Payment pending", `${label} awaiting ${METHOD_LABEL[method]} confirmation.`, tickets[0].id);
        capacityCheck(type);
      } else {
        notify("PAYMENT", "WARNING", "Payment failed", `${label} — ${charge.failureReason}.`, tickets[0].id);
      }
      touch();
      return { payment, tickets, attendee, instructions: charge.instructions };
    },
  },

  "tickets.send": {
    permission: "tickets.send",
    run: ({ ticketId, channel }) => {
      const d = db();
      const t = ticketOf(ticketId);
      const p = paymentOf(t.paymentId);
      if (p.status !== "PAID") fail("E-tickets can only be sent for paid tickets.");
      if (t.status === "REFUNDED" || t.status === "VOID") fail("This ticket is no longer valid.");
      const a = d.attendees.find((x) => x.id === t.attendeeId)!;
      // Messaging provider boundary: demo mode records the message and sends nothing.
      const msg = { id: `msg_${String(++d.seq.msg).padStart(4, "0")}`, kind: "E_TICKET" as const, channel, to: channel === "EMAIL" ? a.email : a.phone, subject: `Your ACL e-ticket ${t.id}`, body: `E-ticket ${t.id} for ${d.event.name}`, ticketId: t.id, recipients: 1, status: "LOGGED_DEMO" as const, at: nowIso() };
      d.messages.unshift(msg);
      touch();
      return msg;
    },
  },

  "tickets.suspend": {
    permission: "tickets.manage",
    run: ({ ticketId, reason }) => {
      const t = ticketOf(ticketId);
      if (t.status !== "ACTIVE") fail(t.status === "USED" ? "This ticket has already been used." : "Only active tickets can be suspended.");
      t.status = "SUSPENDED"; t.suspendedReason = reason;
      touch();
      return t;
    },
  },
  "tickets.reinstate": {
    permission: "tickets.manage",
    run: ({ ticketId }) => {
      const t = ticketOf(ticketId);
      if (t.status !== "SUSPENDED") fail("Ticket is not suspended.");
      t.status = "ACTIVE"; t.suspendedReason = undefined;
      touch();
      return t;
    },
  },

  "attendees.update": {
    permission: "attendees.edit",
    run: ({ attendeeId, ...patch }) => {
      const a = db().attendees.find((x) => x.id === attendeeId) ?? fail("Attendee not found", 404);
      Object.assign(a, patch);
      for (const table of db().tables) {
        const t = db().tickets.find((x) => x.id === table.ticketId);
        if (t?.attendeeId === a.id) table.buyer = a.name;
      }
      touch();
      return a;
    },
  },

  "payments.confirm": {
    permission: "payments.manage",
    run: ({ paymentId }) => {
      const p = paymentOf(paymentId);
      if (p.status !== "PENDING") fail("Only pending payments can be confirmed.");
      p.status = "PAID"; p.paidAt = nowIso();
      notify("PAYMENT", "INFO", "Payment received", `${naira(p.amount)} ${METHOD_LABEL[p.method]} confirmed for ${p.ticketIds[0]}.`, p.ticketIds[0]);
      touch();
      return p;
    },
  },
  "payments.fail": {
    permission: "payments.manage",
    run: ({ paymentId, reason }) => {
      const d = db();
      const p = paymentOf(paymentId);
      if (p.status !== "PENDING") fail("Only pending payments can be marked failed.");
      p.status = "FAILED"; p.failureReason = reason;
      const tickets = d.tickets.filter((t) => p.ticketIds.includes(t.id));
      tickets.forEach((t) => (t.status = "VOID"));
      releaseSeats(tickets);
      touch();
      return p;
    },
  },
  "payments.refund": {
    permission: "payments.refund",
    run: ({ paymentId, reason }) => {
      const d = db();
      const p = paymentOf(paymentId);
      if (!d.event.rules.refundsEnabled) fail("Refunds are disabled in event settings.");
      if (p.status !== "PAID") fail("Only paid transactions can be refunded.");
      const tickets = d.tickets.filter((t) => p.ticketIds.includes(t.id));
      if (tickets.some((t) => t.status === "USED")) fail("A ticket on this payment has already been scanned at the gate and cannot be refunded.");
      const res = getPaymentProvider().refund(p.reference, p.amount);
      if (!res.ok) fail(res.failureReason ?? "The payment provider rejected the refund.");
      p.status = "REFUNDED"; p.refundedAt = nowIso(); p.refundReason = reason;
      tickets.forEach((t) => (t.status = "REFUNDED"));
      releaseSeats(tickets);
      notify("REFUND", "INFO", "Ticket refunded", `${p.ticketIds.join(", ")} refunded (${naira(p.amount)}). ${reason}`, p.ticketIds[0]);
      touch();
      return p;
    },
  },

  "seats.reserve": {
    permission: "seating.manage",
    run: ({ seatIds, note }) => {
      const seats = seatIds.map((id) => db().seats.find((s) => s.id === id) ?? fail("Seat not found", 404));
      const taken = seats.find((s) => s.status !== "AVAILABLE");
      if (taken) fail(`${taken.label} is no longer available.`);
      seats.forEach((s) => { s.status = "RESERVED"; s.reservedFor = note; });
      touch();
      return seats;
    },
  },
  "seats.release": {
    permission: "seating.manage",
    run: ({ seatIds }) => {
      const seats = seatIds.map((id) => db().seats.find((s) => s.id === id) ?? fail("Seat not found", 404));
      if (seats.some((s) => s.status === "SOLD")) fail("Sold seats can only be freed by refunding the ticket.");
      seats.forEach((s) => { s.status = "AVAILABLE"; s.reservedFor = undefined; });
      touch();
      return seats;
    },
  },
  "tables.guests": {
    permission: "seating.manage",
    run: ({ tableId, guests }) => {
      const table = db().tables.find((t) => t.id === tableId) ?? fail("Table not found", 404);
      if (!table.ticketId) fail("This table has not been booked.");
      if (guests.length > table.capacity) fail(`This table seats ${table.capacity}.`);
      table.guests = guests;
      touch();
      return table;
    },
  },

  "agents.create": {
    permission: "agents.manage",
    run: (input) => {
      const d = db();
      const agent = { id: `AGT-${String(++d.seq.agent).padStart(3, "0")}`, ...input, status: "ACTIVE" as const, createdAt: nowIso() };
      d.agents.push(agent);
      touch();
      return agent;
    },
  },
  "agents.update": {
    permission: "agents.manage",
    run: ({ agentId, ...patch }) => {
      const agent = db().agents.find((a) => a.id === agentId) ?? fail("Agent not found", 404);
      Object.assign(agent, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)));
      touch();
      return agent;
    },
  },

  "promos.create": {
    permission: "marketing.manage",
    run: (input) => {
      const d = db();
      if (d.promoCodes.some((p) => p.code === input.code)) fail("That promo code already exists.");
      const promo = { ...input, uses: 0, active: true };
      d.promoCodes.unshift(promo);
      touch();
      return promo;
    },
  },
  "promos.toggle": {
    permission: "marketing.manage",
    run: ({ code, active }) => {
      const promo = db().promoCodes.find((p) => p.code === code) ?? fail("Promo code not found", 404);
      promo.active = active;
      touch();
      return promo;
    },
  },
  "marketing.broadcast": {
    permission: "marketing.manage",
    run: ({ segment, channel, subject, body }) => {
      const d = db();
      const paid = (t: Ticket) => d.payments.find((p) => p.id === t.paymentId)?.status;
      const mine = d.tickets.filter((t) => t.eventId === d.event.id);
      const audience = mine.filter((t) => {
        const s = paid(t);
        if (segment === "PENDING_PAYMENT") return s === "PENDING" && t.status === "ACTIVE";
        if (s !== "PAID" || t.status === "REFUNDED" || t.status === "VOID") return false;
        if (segment === "NOT_CHECKED_IN") return t.status === "ACTIVE";
        if (segment === "PREMIUM") return t.typeId !== "GEN" && t.typeId !== "VIP";
        return true;
      });
      const recipients = new Set(audience.map((t) => t.attendeeId)).size;
      if (recipients === 0) fail("Nobody matches that audience.");
      const msg = { id: `msg_${String(++d.seq.msg).padStart(4, "0")}`, kind: "BROADCAST" as const, channel, to: segment, subject, body, recipients, status: "LOGGED_DEMO" as const, at: nowIso() };
      d.messages.unshift(msg);
      touch();
      return msg;
    },
  },

  "notifications.read": {
    permission: null,
    run: ({ id }) => {
      db().notifications.forEach((n) => { if (!id || n.id === id) n.read = true; });
      touch();
      return { ok: true };
    },
  },

  "settings.event": {
    permission: "settings.manage",
    run: (input) => {
      const d = db();
      const held = d.seats.filter((s) => s.status !== "AVAILABLE").length;
      if (input.capacity < held) fail(`Capacity cannot go below the ${held} places already sold or held.`);
      const [doors, main, end] = [input.doorsOpenAt, input.mainCardAt, input.endsAt].map((v) => Date.parse(v));
      if ([doors, main, end].some(Number.isNaN)) fail("Enter valid dates and times.");
      if (!(doors < main && main < end)) fail("Doors must open before the main card, and the main card before the event ends.");
      Object.assign(d.event, input, { doorsOpenAt: new Date(doors).toISOString(), mainCardAt: new Date(main).toISOString(), endsAt: new Date(end).toISOString() });
      touch();
      return d.event;
    },
  },
  "settings.prices": {
    permission: "settings.manage",
    run: ({ prices }) => {
      // Applies to future sales only; issued tickets keep the price they were sold at.
      for (const t of db().ticketTypes) if (prices[t.id] !== undefined) t.price = prices[t.id]!;
      touch();
      return db().ticketTypes;
    },
  },
  "settings.gate": {
    permission: "settings.manage",
    run: ({ gateId, ...rest }) => {
      const d = db();
      if (gateId) {
        const gate = d.gates.find((g) => g.id === gateId) ?? fail("Gate not found", 404);
        if (!rest.active && d.gates.filter((g) => g.active && g.id !== gateId).length === 0) fail("At least one gate must stay open.");
        Object.assign(gate, rest);
      } else {
        d.gates.push({ id: `G${d.gates.length + 1}`, ...rest });
      }
      touch();
      return d.gates;
    },
  },
  "settings.rules": {
    permission: "settings.manage",
    run: (input) => {
      Object.assign(db().event.rules, input);
      touch();
      return db().event.rules;
    },
  },
  "settings.permissions": {
    permission: "settings.manage",
    run: ({ role, permissions }) => {
      const valid = new Set(ALL_PERMISSIONS.map((p) => p.id));
      // settings.manage stays with the Super Admin so access control cannot be delegated away.
      db().rolePermissions[role] = permissions.filter((p): p is Permission => valid.has(p as Permission) && p !== "settings.manage");
      touch();
      return db().rolePermissions;
    },
  },
  "settings.reset": {
    permission: "settings.manage",
    run: () => { resetDb(); return { ok: true }; },
  },
};

export function runAction(name: string, rawInput: unknown, user: User) {
  if (!(name in actions)) throw new ActionError("Unknown action", 404);
  const key = name as ActionName;
  const def = actions[key] as ActionDef<ActionName>;
  const perms = db().rolePermissions[user.role];
  if (def.permission && !perms.includes(def.permission)) {
    throw new ActionError(`Your role (${user.title}) is not permitted to do this.`, 403);
  }
  const parsed = actionSchemas[key].safeParse(rawInput);
  if (!parsed.success) {
    throw new ActionError(parsed.error.issues.map((i) => i.message).join(" · "), 422);
  }
  return def.run(parsed.data as never, user);
}
