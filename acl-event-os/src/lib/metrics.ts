/**
 * Every figure shown in the product is derived here from records.
 * UI components never hold totals of their own.
 */
import { dayKey, shortDay } from "./format";
import type {
  Agent, Attendee, CheckIn, Gate, Payment, PaymentMethod, PaymentStatus, Seat, Snapshot, Ticket,
  TicketType, TicketTypeId, User,
} from "./types";

const DAY = 86_400_000;

export interface Index {
  type: Map<TicketTypeId, TicketType>;
  attendee: Map<string, Attendee>;
  payment: Map<string, Payment>;
  ticket: Map<string, Ticket>;
  gate: Map<string, Gate>;
  user: Map<string, User>;
  agent: Map<string, Agent>;
  seat: Map<string, Seat>;
  /** Tickets that count as sold: paid for and not refunded / voided. */
  sold: Ticket[];
}

export function buildIndex(s: Snapshot): Index {
  const by = <T extends { id: string }>(rows: T[]) => new Map(rows.map((r) => [r.id, r]));
  const payment = by(s.payments);
  return {
    type: new Map(s.ticketTypes.map((t) => [t.id, t])),
    attendee: by(s.attendees),
    payment,
    ticket: by(s.tickets),
    gate: by(s.gates),
    user: by(s.users),
    agent: by(s.agents),
    seat: by(s.seats),
    sold: s.tickets.filter((t) => isSold(t, payment.get(t.paymentId))),
  };
}

export function isSold(t: Ticket, p?: Payment) {
  return p?.status === "PAID" && (t.status === "ACTIVE" || t.status === "USED" || t.status === "SUSPENDED");
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const growth = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);

export function kpis(s: Snapshot, ix: Index) {
  const now = Date.parse(s.now);
  const sold = ix.sold.length;
  const revenue = sum(ix.sold.map((t) => t.pricePaid));
  const checkedIn = ix.sold.filter((t) => t.status === "USED").length;
  const inWindow = (t: Ticket, from: number, to: number) => { const at = Date.parse(t.createdAt); return at > from && at <= to; };
  const last7 = ix.sold.filter((t) => inWindow(t, now - 7 * DAY, now));
  const prev7 = ix.sold.filter((t) => inWindow(t, now - 14 * DAY, now - 7 * DAY));
  return {
    sold,
    capacity: s.event.capacity,
    soldShare: sold / Math.max(1, s.event.capacity),
    unsold: Math.max(0, s.event.capacity - sold),
    revenue,
    checkedIn,
    checkedInShare: sold ? checkedIn / sold : 0,
    /** Ticket holders who have not arrived yet. */
    remaining: sold - checkedIn,
    remainingShare: sold ? (sold - checkedIn) / sold : 0,
    ticketGrowth: growth(last7.length, prev7.length),
    revenueGrowth: growth(sum(last7.map((t) => t.pricePaid)), sum(prev7.map((t) => t.pricePaid))),
  };
}

export function byType(s: Snapshot, ix: Index) {
  return s.ticketTypes.map((type) => {
    const sold = ix.sold.filter((t) => t.typeId === type.id);
    const section = s.seats.filter((x) => x.typeId === type.id);
    return {
      type,
      sold: sold.length,
      revenue: sum(sold.map((t) => t.pricePaid)),
      checkedIn: sold.filter((t) => t.status === "USED").length,
      capacity: section.length,
      available: section.filter((x) => x.status === "AVAILABLE").length,
      reserved: section.filter((x) => x.status === "RESERVED").length,
      /** Seats held by unpaid (pending) orders. */
      pending: section.filter((x) => x.status === "SOLD").length - sold.length,
    };
  });
}

export function revenue(s: Snapshot, ix: Index) {
  const total = (st: PaymentStatus) => sum(s.payments.filter((p) => p.status === st).map((p) => p.amount));
  const paid = total("PAID");
  return {
    paid,
    pending: total("PENDING"),
    refunded: total("REFUNDED"),
    failed: total("FAILED"),
    target: s.event.revenueTarget,
    progress: s.event.revenueTarget ? paid / s.event.revenueTarget : 0,
    avgOrder: ix.sold.length ? paid / s.payments.filter((p) => p.status === "PAID").length : 0,
  };
}

export type TrendMode = "daily" | "weekly" | "cumulative";
export interface TrendPoint { key: string; label: string; sold: number; remaining: number; revenue: number }

/** Sales over time. `remaining` is unsold capacity at the end of each bucket. */
export function salesTrend(s: Snapshot, ix: Index, mode: TrendMode): TrendPoint[] {
  if (ix.sold.length === 0) return [];
  const now = Date.parse(s.now);
  const perDay = new Map<string, { sold: number; revenue: number }>();
  for (const t of ix.sold) {
    const k = dayKey(t.createdAt);
    const b = perDay.get(k) ?? { sold: 0, revenue: 0 };
    b.sold++; b.revenue += t.pricePaid;
    perDay.set(k, b);
  }
  const first = Math.min(...ix.sold.map((t) => Date.parse(t.createdAt)));
  const days: TrendPoint[] = [];
  let cumSold = 0, cumRev = 0;
  for (let ms = first; dayKey(ms) <= dayKey(now); ms += DAY) {
    const k = dayKey(ms);
    const b = perDay.get(k) ?? { sold: 0, revenue: 0 };
    cumSold += b.sold; cumRev += b.revenue;
    days.push({ key: k, label: shortDay(new Date(ms).toISOString()), sold: b.sold, revenue: b.revenue, remaining: Math.max(0, s.event.capacity - cumSold) });
    if (k === dayKey(now)) break;
  }
  if (mode === "daily") return days.slice(-14);
  if (mode === "cumulative") {
    let cs = 0, cr = 0;
    return days.map((d) => ({ ...d, sold: (cs += d.sold), revenue: (cr += d.revenue) }));
  }
  // Weekly: 7-day buckets counted back from today, so the last bar is "this week".
  const weeks: TrendPoint[] = [];
  for (let end = days.length; end > 0; end -= 7) {
    const chunk = days.slice(Math.max(0, end - 7), end);
    weeks.unshift({ key: chunk[0].key, label: `${chunk[0].label} – ${chunk[chunk.length - 1].label}`, sold: sum(chunk.map((d) => d.sold)), revenue: sum(chunk.map((d) => d.revenue)), remaining: chunk[chunk.length - 1].remaining });
  }
  void cumRev;
  return weeks;
}

export const METHODS: PaymentMethod[] = ["CARD", "BANK_TRANSFER", "USSD", "CASH_OUTLET", "POS_AGENT"];

export function byMethod(s: Snapshot) {
  return METHODS.map((method) => {
    const all = s.payments.filter((p) => p.method === method);
    const paid = all.filter((p) => p.status === "PAID");
    return { method, transactions: all.length, paid: paid.length, amount: sum(paid.map((p) => p.amount)) };
  });
}

export function byStatus(s: Snapshot) {
  return (["PAID", "PENDING", "FAILED", "REFUNDED"] as PaymentStatus[]).map((status) => {
    const rows = s.payments.filter((p) => p.status === status);
    return { status, count: rows.length, amount: sum(rows.map((p) => p.amount)) };
  });
}

export function checkInStats(s: Snapshot, ix: Index) {
  const now = Date.parse(s.now);
  const granted = s.checkIns.filter((c) => c.result === "GRANTED");
  const rejected = s.checkIns.filter((c) => c.result === "REJECTED");
  const timed = granted.filter((c) => c.durationMs !== undefined);
  return {
    total: ix.sold.filter((t) => t.status === "USED").length,
    lastHour: granted.filter((c) => Date.parse(c.at) > now - 3_600_000).length,
    avgSpeedSec: timed.length ? sum(timed.map((c) => c.durationMs!)) / timed.length / 1000 : null,
    rejected: rejected.length,
    duplicates: rejected.filter((c) => c.reason === "DUPLICATE").length,
    last: s.checkIns[s.checkIns.length - 1] as CheckIn | undefined,
    byGate: s.gates.map((g) => ({ gate: g, granted: granted.filter((c) => c.gateId === g.id).length, rejected: rejected.filter((c) => c.gateId === g.id).length })),
  };
}

/** Admissions per 15 minutes since doors. */
export function arrivals(s: Snapshot) {
  const start = Date.parse(s.event.doorsOpenAt);
  const now = Date.parse(s.now);
  const step = 15 * 60_000;
  const out: { at: string; admitted: number }[] = [];
  for (let t = start; t <= now && out.length < 64; t += step) {
    out.push({ at: new Date(t).toISOString(), admitted: s.checkIns.filter((c) => c.result === "GRANTED" && Date.parse(c.at) >= t && Date.parse(c.at) < t + step).length });
  }
  return out;
}

export function agentStats(s: Snapshot, ix: Index) {
  return s.agents.map((agent) => {
    const sold = ix.sold.filter((t) => t.agentId === agent.id);
    const rev = sum(sold.map((t) => t.pricePaid));
    return { agent, sales: sold.length, revenue: rev, commission: Math.round(rev * agent.commissionRate) };
  });
}

/** Sales channel as used by the recent-sales filters. */
export function channelOf(p: Payment): "ONLINE" | "POS" | "BANK" | "USSD" | "CASH" {
  return p.method === "CARD" ? "ONLINE" : p.method === "POS_AGENT" ? "POS" : p.method === "BANK_TRANSFER" ? "BANK" : p.method === "USSD" ? "USSD" : "CASH";
}

/** Flat row used by attendee, sales and report tables. */
export interface TicketRow {
  ticket: Ticket;
  type: TicketType;
  attendee: Attendee;
  payment: Payment;
  checkIn: "CHECKED_IN" | "NOT_ARRIVED" | "N/A";
}

export function ticketRows(s: Snapshot, ix: Index): TicketRow[] {
  return s.tickets.map((ticket) => {
    const payment = ix.payment.get(ticket.paymentId)!;
    return {
      ticket,
      type: ix.type.get(ticket.typeId)!,
      attendee: ix.attendee.get(ticket.attendeeId)!,
      payment,
      checkIn: ticket.status === "USED" ? "CHECKED_IN" : isSold(ticket, payment) ? "NOT_ARRIVED" : "N/A",
    };
  });
}
