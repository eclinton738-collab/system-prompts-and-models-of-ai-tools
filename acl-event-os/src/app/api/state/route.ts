import { getStore } from "@/lib/server/store";
import { ok } from "@/lib/server/api";
import {
  headlineStats, breakdownByType, salesTrend, weeklyTrend, weekOnWeek,
  byPaymentMethod, byChannel, byPaymentStatus, checkInStats, agentPerformance,
} from "@/lib/domain/stats";

export const dynamic = "force-dynamic";

/**
 * The dashboard snapshot. Aggregates are computed on the server so every
 * client sees one set of numbers; lists are fetched separately and paged.
 */
export async function GET() {
  const store = getStore();
  const event = store.event;
  const tickets = store.tickets();
  const checkIns = store.checkIns();
  const payments = store.payments();
  const now = Date.now();

  const daily = salesTrend(tickets, event.capacity, 30, now);

  return ok({
    event,
    gates: event.gates,
    users: store.users,
    stats: headlineStats(tickets, checkIns, event),
    breakdown: breakdownByType(tickets),
    trend: { daily, weekly: weeklyTrend(daily, event.capacity) },
    wow: weekOnWeek(tickets, now),
    methods: byPaymentMethod(payments),
    channels: byChannel(tickets),
    paymentStatus: byPaymentStatus(tickets),
    checkIn: checkInStats(checkIns, now),
    agents: agentPerformance(store.agents, tickets),
    recentSales: [...tickets]
      .sort((a, b) => Date.parse(b.purchasedAt) - Date.parse(a.purchasedAt))
      .slice(0, 12)
      .map((t) => ({
        id: t.id,
        name: t.attendeeName,
        type: t.type,
        amount: t.price,
        method: store.payment(t.paymentId)?.method ?? "CARD",
        channel: t.channel,
        status: t.paymentStatus,
        at: t.purchasedAt,
      })),
    recentScans: checkIns.slice(0, 10),
    lastScan: checkIns.find((c) => c.result === "GRANTED") ?? null,
    securityEvents: store.securityEvents.slice(0, 12),
    notifications: store.notifications.slice(0, 20),
    tables: store.tables,
    gatesOpen: store.gatesOpen(now),
    serverTime: new Date(now).toISOString(),
  });
}
