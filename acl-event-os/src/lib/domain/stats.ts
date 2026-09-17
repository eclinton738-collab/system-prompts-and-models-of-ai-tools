import { TICKET_TYPES, TICKET_TYPE_ORDER } from "./catalog";
import type {
  AclEvent, Agent, CheckIn, Payment, PaymentMethod, PaymentStatus,
  SalesChannel, Ticket, TicketTypeCode,
} from "./types";

/**
 * Pure analytics. Every number the dashboard shows comes from one of these
 * functions — there is no place in the UI where a total is typed by hand.
 */

export interface HeadlineStats {
  ticketsSold: number;
  capacity: number;
  sellThrough: number;
  revenue: number;
  projectedRevenue: number;
  revenueProgress: number;
  checkedIn: number;
  checkedInRate: number;
  awaitingCheckIn: number;
  awaitingRate: number;
  seatsCommitted: number;
  paid: number;
  pending: number;
  failed: number;
  refunded: number;
  pendingValue: number;
  refundedValue: number;
}

/** Revenue only ever counts settled money. */
export function revenueOf(tickets: Ticket[]): number {
  return tickets.reduce((sum, t) => (t.paymentStatus === "PAID" ? sum + t.price : sum), 0);
}

export function headlineStats(tickets: Ticket[], checkIns: CheckIn[], event: AclEvent): HeadlineStats {
  const ticketsSold = tickets.length;
  const revenue = revenueOf(tickets);
  const checkedIn = tickets.filter((t) => t.status === "USED").length;
  const byStatus = (s: PaymentStatus) => tickets.filter((t) => t.paymentStatus === s);
  const paid = byStatus("PAID");
  const pending = byStatus("PENDING");
  const failed = byStatus("FAILED");
  const refunded = byStatus("REFUNDED");
  const seatsCommitted = tickets.reduce(
    (sum, t) => (t.paymentStatus === "FAILED" ? sum : sum + TICKET_TYPES[t.type].seatsPerTicket),
    0,
  );
  return {
    ticketsSold,
    capacity: event.capacity,
    sellThrough: event.capacity ? (ticketsSold / event.capacity) * 100 : 0,
    revenue,
    projectedRevenue: event.projectedRevenue,
    revenueProgress: event.projectedRevenue ? (revenue / event.projectedRevenue) * 100 : 0,
    checkedIn,
    checkedInRate: ticketsSold ? (checkedIn / ticketsSold) * 100 : 0,
    awaitingCheckIn: ticketsSold - checkedIn,
    awaitingRate: ticketsSold ? ((ticketsSold - checkedIn) / ticketsSold) * 100 : 0,
    seatsCommitted,
    paid: paid.length,
    pending: pending.length,
    failed: failed.length,
    refunded: refunded.length,
    pendingValue: pending.reduce((s, t) => s + t.price, 0),
    refundedValue: refunded.reduce((s, t) => s + t.price, 0),
  };
}

export interface TypeBreakdown {
  type: TicketTypeCode;
  name: string;
  price: number;
  sold: number;
  allocation: number;
  remaining: number;
  revenue: number;
  checkedIn: number;
  share: number;
}

export function breakdownByType(tickets: Ticket[]): TypeBreakdown[] {
  const total = tickets.length;
  return TICKET_TYPE_ORDER.map((type) => {
    const def = TICKET_TYPES[type];
    const ofType = tickets.filter((t) => t.type === type);
    const live = ofType.filter((t) => t.paymentStatus !== "FAILED");
    return {
      type,
      name: def.name,
      price: def.price,
      sold: ofType.length,
      allocation: def.allocation,
      remaining: Math.max(0, def.allocation - live.length),
      revenue: revenueOf(ofType),
      checkedIn: ofType.filter((t) => t.status === "USED").length,
      share: total ? (ofType.length / total) * 100 : 0,
    };
  });
}

export interface TrendPoint {
  date: string;
  label: string;
  sold: number;
  revenue: number;
  cumulativeSold: number;
  cumulativeRevenue: number;
  remaining: number;
}

/** Daily sales history, oldest first, with running totals and inventory left. */
export function salesTrend(tickets: Ticket[], capacity: number, days = 30, now = Date.now()): TrendPoint[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const startMs = start.getTime() - (days - 1) * 86_400_000;

  const buckets: TrendPoint[] = Array.from({ length: days }, (_, i) => {
    const d = new Date(startMs + i * 86_400_000);
    return {
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-NG", { day: "2-digit", month: "short" }),
      sold: 0,
      revenue: 0,
      cumulativeSold: 0,
      cumulativeRevenue: 0,
      remaining: capacity,
    };
  });
  const index = new Map(buckets.map((b, i) => [b.date, i]));

  // Sales older than the window still count toward the running totals.
  let priorSold = 0;
  let priorRevenue = 0;
  for (const ticket of tickets) {
    const day = new Date(ticket.purchasedAt).toISOString().slice(0, 10);
    const i = index.get(day);
    if (i === undefined) {
      if (Date.parse(ticket.purchasedAt) < startMs) {
        priorSold += 1;
        if (ticket.paymentStatus === "PAID") priorRevenue += ticket.price;
      }
      continue;
    }
    buckets[i].sold += 1;
    if (ticket.paymentStatus === "PAID") buckets[i].revenue += ticket.price;
  }

  let runningSold = priorSold;
  let runningRevenue = priorRevenue;
  for (const bucket of buckets) {
    runningSold += bucket.sold;
    runningRevenue += bucket.revenue;
    bucket.cumulativeSold = runningSold;
    bucket.cumulativeRevenue = runningRevenue;
    bucket.remaining = Math.max(0, capacity - runningSold);
  }
  return buckets;
}

export interface WeeklyPoint {
  label: string;
  sold: number;
  revenue: number;
  remaining: number;
  cumulativeSold: number;
  cumulativeRevenue: number;
}

export function weeklyTrend(daily: TrendPoint[], capacity: number): WeeklyPoint[] {
  const weeks: WeeklyPoint[] = [];
  for (let i = 0; i < daily.length; i += 7) {
    const slice = daily.slice(i, i + 7);
    if (!slice.length) continue;
    const last = slice[slice.length - 1];
    weeks.push({
      label: `${slice[0].label} – ${last.label}`,
      sold: slice.reduce((s, d) => s + d.sold, 0),
      revenue: slice.reduce((s, d) => s + d.revenue, 0),
      cumulativeSold: last.cumulativeSold,
      cumulativeRevenue: last.cumulativeRevenue,
      remaining: Math.max(0, capacity - last.cumulativeSold),
    });
  }
  return weeks;
}

export interface Delta {
  value: number;
  direction: "up" | "down" | "flat";
  label: string;
}

/** Week-on-week movement, computed from purchase timestamps. */
export function weekOnWeek(tickets: Ticket[], now = Date.now()): { tickets: Delta; revenue: Delta } {
  const week = 7 * 86_400_000;
  const inRange = (from: number, to: number) =>
    tickets.filter((t) => {
      const at = Date.parse(t.purchasedAt);
      return at >= from && at < to;
    });
  const current = inRange(now - week, now);
  const previous = inRange(now - 2 * week, now - week);

  const delta = (a: number, b: number): Delta => {
    if (b === 0) return { value: a > 0 ? 100 : 0, direction: a > 0 ? "up" : "flat", label: "vs last week" };
    const change = ((a - b) / b) * 100;
    return {
      value: Math.abs(change),
      direction: change > 0.5 ? "up" : change < -0.5 ? "down" : "flat",
      label: "vs last week",
    };
  };
  return {
    tickets: delta(current.length, previous.length),
    revenue: delta(revenueOf(current), revenueOf(previous)),
  };
}

export interface Slice {
  key: string;
  label: string;
  value: number;
  amount: number;
  share: number;
  color: string;
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
  USSD: "USSD",
  POS_AGENT: "POS / Agents",
  CASH_OUTLET: "Cash (Outlets)",
};

const METHOD_COLOR: Record<PaymentMethod, string> = {
  CARD: "#E11021",
  BANK_TRANSFER: "#3396FF",
  USSD: "#A855F7",
  POS_AGENT: "#E4B13E",
  CASH_OUTLET: "#17C26B",
};

export function byPaymentMethod(payments: Payment[]): Slice[] {
  const total = payments.length;
  return (Object.keys(METHOD_LABEL) as PaymentMethod[])
    .map((method) => {
      const rows = payments.filter((p) => p.method === method);
      return {
        key: method,
        label: METHOD_LABEL[method],
        value: rows.length,
        amount: rows.reduce((s, p) => (p.status === "PAID" ? s + p.amount : s), 0),
        share: total ? (rows.length / total) * 100 : 0,
        color: METHOD_COLOR[method],
      };
    })
    .sort((a, b) => b.value - a.value);
}

const CHANNEL_LABEL: Record<SalesChannel, string> = {
  WEBSITE: "Website",
  POS_AGENT: "POS / Agents",
  BANK_TRANSFER: "Bank Transfer",
  USSD: "USSD",
  CASH: "Cash (Outlets)",
};

export function byChannel(tickets: Ticket[]): Slice[] {
  const total = tickets.length;
  return (Object.keys(CHANNEL_LABEL) as SalesChannel[])
    .map((channel) => {
      const rows = tickets.filter((t) => t.channel === channel);
      return {
        key: channel,
        label: CHANNEL_LABEL[channel],
        value: rows.length,
        amount: revenueOf(rows),
        share: total ? (rows.length / total) * 100 : 0,
        color: METHOD_COLOR[channel === "WEBSITE" ? "CARD" : channel === "CASH" ? "CASH_OUTLET" : channel],
      };
    })
    .sort((a, b) => b.value - a.value);
}

const PAYMENT_STATUS_COLOR: Record<PaymentStatus, string> = {
  PAID: "#17C26B",
  PENDING: "#F5A524",
  FAILED: "#FF3B3B",
  REFUNDED: "#6E7683",
};

export function byPaymentStatus(tickets: Ticket[]): Slice[] {
  const total = tickets.length;
  return (["PAID", "PENDING", "FAILED", "REFUNDED"] as PaymentStatus[]).map((status) => {
    const rows = tickets.filter((t) => t.paymentStatus === status);
    return {
      key: status,
      label: status.charAt(0) + status.slice(1).toLowerCase(),
      value: rows.length,
      amount: rows.reduce((s, t) => s + t.price, 0),
      share: total ? (rows.length / total) * 100 : 0,
      color: PAYMENT_STATUS_COLOR[status],
    };
  });
}

export interface CheckInStats {
  granted: number;
  rejected: number;
  lastHour: number;
  averageScanMs: number;
  duplicates: number;
  perGate: Array<{ gate: string; granted: number; rejected: number }>;
  perHour: Array<{ label: string; granted: number; rejected: number }>;
}

export function checkInStats(checkIns: CheckIn[], now = Date.now()): CheckInStats {
  const granted = checkIns.filter((c) => c.result === "GRANTED");
  const rejected = checkIns.filter((c) => c.result === "REJECTED");
  const lastHour = granted.filter((c) => now - Date.parse(c.scannedAt) <= 3_600_000).length;
  const averageScanMs = granted.length
    ? granted.reduce((s, c) => s + c.durationMs, 0) / granted.length
    : 0;

  const gateMap = new Map<string, { gate: string; granted: number; rejected: number }>();
  for (const c of checkIns) {
    const row = gateMap.get(c.gateName) ?? { gate: c.gateName, granted: 0, rejected: 0 };
    if (c.result === "GRANTED") row.granted += 1;
    else row.rejected += 1;
    gateMap.set(c.gateName, row);
  }

  // Six one-hour buckets ending now.
  const perHour = Array.from({ length: 6 }, (_, i) => {
    const to = now - (5 - i) * 3_600_000;
    const from = to - 3_600_000;
    const within = (c: CheckIn) => {
      const at = Date.parse(c.scannedAt);
      return at >= from && at < to;
    };
    return {
      label: new Date(to).toLocaleTimeString("en-NG", { hour: "numeric", hour12: true }).toUpperCase(),
      granted: granted.filter(within).length,
      rejected: rejected.filter(within).length,
    };
  });

  return {
    granted: granted.length,
    rejected: rejected.length,
    lastHour,
    averageScanMs,
    duplicates: rejected.filter((c) => c.reason === "ALREADY_USED").length,
    perGate: [...gateMap.values()].sort((a, b) => b.granted - a.granted),
    perHour,
  };
}

export interface AgentPerformance {
  agent: Agent;
  sales: number;
  revenue: number;
  commission: number;
  checkedIn: number;
}

export function agentPerformance(agents: Agent[], tickets: Ticket[]): AgentPerformance[] {
  return agents
    .map((agent) => {
      const sold = tickets.filter((t) => t.agentId === agent.id);
      const revenue = revenueOf(sold);
      return {
        agent,
        sales: sold.length,
        revenue,
        commission: Math.round(revenue * agent.commissionRate),
        checkedIn: sold.filter((t) => t.status === "USED").length,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}
