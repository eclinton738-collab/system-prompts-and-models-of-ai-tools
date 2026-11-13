import Link from "next/link";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import { getExecutiveDashboard } from "@/server/services/analytics";
import { BarList, Stat } from "@/components/ui";
import { compact, flag, fmtDayMonth, money } from "@/lib/format";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requirePermission("analytics.view");
  const days = [7, 30, 90].includes(Number((await searchParams).days)) ? Number((await searchParams).days) : 30;
  const d = await getExecutiveDashboard(days);
  const since = new Date(Date.now() - days * 864e5);
  const [fighterViews, videoViews, countries] = await Promise.all([
    db.analyticsEvent.groupBy({ by: ["entityId"], where: { type: "page_view", entityType: "fighter", createdAt: { gte: since } }, _count: true, orderBy: { _count: { entityId: "desc" } }, take: 8 }),
    db.analyticsEvent.groupBy({ by: ["entityId"], where: { type: "video_view", createdAt: { gte: since } }, _count: true, orderBy: { _count: { entityId: "desc" } }, take: 8 }),
    db.country.findMany({ select: { code: true, name: true } }),
  ]);
  const [fighters, videos] = await Promise.all([
    db.fighter.findMany({ where: { id: { in: fighterViews.map((f) => f.entityId!) } }, select: { id: true, firstName: true, lastName: true } }),
    db.video.findMany({ where: { id: { in: videoViews.map((v) => v.entityId!) } }, select: { id: true, title: true } }),
  ]);
  const max = Math.max(1, ...d.daily.map((x) => x.views));
  const cname = (code: string) => { const c = countries.find((x) => x.code === code); return c ? `${flag(code)} ${c.name}` : code; };
  const hours = Math.round(d.watchSeconds / 3600);
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-4xl sm:text-5xl">Executive dashboard</h1><p className="text-sm text-fog">Last {days} days · first-party analytics</p></div>
        <nav aria-label="Period" className="flex gap-2">{[7, 30, 90].map((n) => <Link key={n} href={`/admin/analytics?days=${n}`} aria-current={n === days ? "page" : undefined} className={`chip min-h-9 px-3 ${n === days ? "chip-red" : "chip-outline"}`}>{n} days</Link>)}</nav>
      </div>
      <section aria-label="Headline metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Visitors" value={compact(d.visitors)} accent /><Stat label="Page views" value={compact(d.pageViews)} /><Stat label="User registrations" value={d.registrations} sub={`${d.signupConversion.toFixed(1)}% of visitors`} /><Stat label="Video views" value={compact(d.videoViews)} sub={`${hours.toLocaleString("en")} h watch time`} />
        <Stat label="Ticket orders" value={d.ticketOrders} sub={`${d.ticketConversion.toFixed(2)}% of event-page views`} /><Stat label="Ticket revenue" value={money(d.ticketRevenueUsdMinor, "USD")} sub="USD equivalent" /><Stat label="Merchandise orders" value={d.merchOrders} sub={`${d.merchConversion.toFixed(2)}% of product views`} /><Stat label="Merchandise revenue" value={money(d.merchRevenueUsdMinor, "USD")} sub="USD equivalent" />
      </section>

      <section className="card mt-6 p-5" aria-labelledby="daily">
        <h2 id="daily" className="mb-4 text-2xl">Page views per day</h2>
        {d.daily.length ? (
          <>
            <div className="flex h-40 items-end gap-px" role="img" aria-label={`Daily page views, peak ${max.toLocaleString("en")}`}>
              {d.daily.map((x) => <div key={x.day.toISOString()} className="group relative flex-1 bg-gold/80 hover:bg-gold" style={{ height: `${Math.max(2, (x.views / max) * 100)}%` }} title={`${fmtDayMonth(x.day)}: ${x.views.toLocaleString("en")} views`} />)}
            </div>
            <div className="mt-1 flex justify-between text-xs text-fog"><span>{fmtDayMonth(d.daily[0].day)}</span><span>Peak {max.toLocaleString("en")}/day</span><span>{fmtDayMonth(d.daily[d.daily.length - 1].day)}</span></div>
          </>
        ) : <p className="text-sm text-fog">No traffic recorded in this period.</p>}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <section className="card p-5"><h2 className="mb-4 text-2xl">Geographic distribution</h2><BarList rows={d.byCountry.map((r) => ({ label: r.label === "Unknown" ? "Unknown" : cname(r.label), value: r.value }))} format={compact} /></section>
        <section className="card p-5"><h2 className="mb-4 text-2xl">Traffic sources</h2><BarList rows={d.bySource} format={compact} /></section>
        <section className="card p-5"><h2 className="mb-4 text-2xl">Top pages</h2><BarList rows={d.topPaths} format={compact} /></section>
        <section className="card p-5"><h2 className="mb-4 text-2xl">Fighter profile views</h2><BarList rows={fighterViews.map((f) => { const x = fighters.find((y) => y.id === f.entityId); return { label: x ? `${x.firstName} ${x.lastName}` : "Unknown", value: f._count }; })} format={compact} /></section>
        <section className="card p-5"><h2 className="mb-4 text-2xl">Video views</h2><BarList rows={videoViews.map((v) => ({ label: videos.find((y) => y.id === v.entityId)?.title ?? "Unknown", value: v._count }))} format={compact} /></section>
        <section className="card p-5"><h2 className="mb-4 text-2xl">Views by content type</h2><BarList rows={d.byEntity} format={compact} /></section>
      </div>
      <section aria-label="Fan engagement" className="mt-6 grid grid-cols-3 gap-3"><Stat label="New follows" value={d.engagement.follows} /><Stat label="Predictions made" value={d.engagement.predictions} /><Stat label="Shares" value={d.engagement.shares} /></section>
      <p className="mt-4 text-xs text-fog">Country is read from the CDN edge header in production. Demo traffic is seeded so this dashboard has shape in the prototype.</p>
    </div>
  );
}
