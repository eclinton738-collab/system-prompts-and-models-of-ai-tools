import "server-only";
import { db } from "../db";

export type TrackInput = { type: string; path?: string; entityType?: string; entityId?: string; userId?: string | null; visitorId?: string; country?: string; source?: string; valueMinor?: number };

export async function track(e: TrackInput) {
  await db.analyticsEvent.create({ data: { ...e, userId: e.userId ?? undefined } }).catch(() => {});
}

const since = (days: number) => new Date(Date.now() - days * 864e5);

export async function getExecutiveDashboard(days = 30) {
  const from = since(days);
  const w = { createdAt: { gte: from } };
  const [pageViews, visitors, registrations, videoViews, watch, ticketOrders, merchOrders, byCountry, bySource, topPaths, byEntity, daily, follows, predictions, shares] = await Promise.all([
    db.analyticsEvent.count({ where: { ...w, type: "page_view" } }),
    db.analyticsEvent.findMany({ where: { ...w, type: "page_view", visitorId: { not: null } }, distinct: ["visitorId"], select: { visitorId: true } }),
    db.user.count({ where: w }),
    db.analyticsEvent.count({ where: { ...w, type: "video_view" } }),
    db.analyticsEvent.aggregate({ where: { ...w, type: "video_watch" }, _sum: { valueMinor: true } }),
    db.analyticsEvent.aggregate({ where: { ...w, type: "ticket_purchase" }, _sum: { valueMinor: true }, _count: true }),
    db.analyticsEvent.aggregate({ where: { ...w, type: "merch_purchase" }, _sum: { valueMinor: true }, _count: true }),
    db.analyticsEvent.groupBy({ by: ["country"], where: { ...w, type: "page_view" }, _count: true, orderBy: { _count: { country: "desc" } }, take: 10 }),
    db.analyticsEvent.groupBy({ by: ["source"], where: { ...w, type: "page_view" }, _count: true, orderBy: { _count: { source: "desc" } }, take: 8 }),
    db.analyticsEvent.groupBy({ by: ["path"], where: { ...w, type: "page_view" }, _count: true, orderBy: { _count: { path: "desc" } }, take: 10 }),
    db.analyticsEvent.groupBy({ by: ["entityType"], where: { ...w, type: "page_view", entityType: { not: null } }, _count: true }),
    db.$queryRaw<{ day: Date; views: bigint }[]>`SELECT date_trunc('day', "createdAt") AS day, count(*) AS views FROM "AnalyticsEvent" WHERE type = 'page_view' AND "createdAt" >= ${from} GROUP BY 1 ORDER BY 1`,
    db.follow.count({ where: w }),
    db.prediction.count({ where: w }),
    db.analyticsEvent.count({ where: { ...w, type: "share" } }),
  ]);
  const eventPageViews = await db.analyticsEvent.count({ where: { ...w, type: "page_view", entityType: "event" } });
  const shopViews = await db.analyticsEvent.count({ where: { ...w, type: "page_view", entityType: "product" } });
  return {
    days,
    pageViews,
    visitors: visitors.length,
    registrations,
    videoViews,
    watchSeconds: watch._sum.valueMinor ?? 0,
    ticketOrders: ticketOrders._count,
    ticketRevenueUsdMinor: ticketOrders._sum.valueMinor ?? 0,
    merchOrders: merchOrders._count,
    merchRevenueUsdMinor: merchOrders._sum.valueMinor ?? 0,
    ticketConversion: eventPageViews ? (ticketOrders._count / eventPageViews) * 100 : 0,
    merchConversion: shopViews ? (merchOrders._count / shopViews) * 100 : 0,
    signupConversion: visitors.length ? (registrations / visitors.length) * 100 : 0,
    byCountry: byCountry.map((r) => ({ label: r.country ?? "Unknown", value: r._count })),
    bySource: bySource.map((r) => ({ label: r.source ?? "direct", value: r._count })),
    topPaths: topPaths.map((r) => ({ label: r.path ?? "—", value: r._count })),
    byEntity: byEntity.map((r) => ({ label: r.entityType!, value: r._count })).sort((a, b) => b.value - a.value),
    daily: daily.map((r) => ({ day: r.day, views: Number(r.views) })),
    engagement: { follows, predictions, shares },
  };
}
