import Link from "next/link";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import { can } from "@/server/permissions";
import { Stat } from "@/components/ui";
import { fmtEventDate, timeAgo } from "@/lib/format";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const user = await requirePermission("admin.access");
  const since = new Date(Date.now() - 7 * 864e5);
  const [fighters, upcomingFights, next, live, drafts, apps, inquiries, messages, reports, users7, orders7, views7, audit] = await Promise.all([
    db.fighter.count({ where: { status: "ACTIVE" } }), db.fight.count({ where: { status: "SCHEDULED" } }),
    db.event.findFirst({ where: { status: "SCHEDULED", type: "FIGHT_NIGHT", startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, include: { _count: { select: { fights: true } }, ticketTypes: { include: { _count: { select: { tickets: true } } } } } }),
    db.event.findFirst({ where: { status: "LIVE" } }), db.article.count({ where: { status: "DRAFT" } }),
    db.application.count({ where: { status: { in: ["APPLICATION", "REVIEW"] } } }), db.sponsorInquiry.count({ where: { status: "NEW" } }), db.contactMessage.count({ where: { status: "NEW" } }), db.report.count({ where: { resolved: false } }),
    db.user.count({ where: { createdAt: { gte: since } } }), db.order.count({ where: { createdAt: { gte: since } } }), db.analyticsEvent.count({ where: { type: "page_view", createdAt: { gte: since } } }),
    can(user.role, "audit.view") ? db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { name: true } } } }) : [],
  ]);
  const sold = next?.ticketTypes.reduce((n, t) => n + t._count.tickets, 0) ?? 0;
  const cap = next?.ticketTypes.reduce((n, t) => n + t.capacity, 0) ?? 0;
  const queue = [["Applications to review", apps, "/admin/applications", "applications.manage"], ["New sponsor inquiries", inquiries, "/admin/sponsor-inquiries", "sponsors.manage"], ["New contact messages", messages, "/admin/messages", "users.manage"], ["Open community reports", reports, "/admin/moderation", "community.moderate"], ["Draft articles", drafts, "/admin/news", "content.manage"]] as const;
  const quick = [["New fighter", "/admin/fighters/new", "fighters.manage"], ["New event", "/admin/events/new", "events.manage"], ["New fight", "/admin/fights/new", "fights.manage"], ["New article", "/admin/news/new", "content.manage"], ["New video", "/admin/videos/new", "content.manage"], ["Send notification", "/admin/notifications", "notifications.send"]] as const;
  return (
    <div className="space-y-8">
      <h1 className="text-4xl sm:text-5xl">Dashboard</h1>
      {live && <Link href="/admin/live" className="flex items-center justify-between gap-3 bg-red p-4 text-white"><span className="display text-2xl">{live.name} is LIVE</span><span className="btn btn-white btn-sm">Open live console</span></Link>}
      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Active fighters" value={fighters} /><Stat label="Scheduled fights" value={upcomingFights} /><Stat label="Page views · 7d" value={views7.toLocaleString("en")} accent /><Stat label="New users · 7d" value={users7} /><Stat label="Orders · 7d" value={orders7} />
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="nx">
          <h2 id="nx" className="mb-2 text-2xl">Next event</h2>
          {next ? (<><p className="display text-3xl">{next.name}</p><p className="text-sm text-fog">{fmtEventDate(next.startsAt)} · {next.venue}, {next.city}</p><p className="mt-3 text-sm">{next._count.fights} fights on the card · {sold.toLocaleString("en")} of {cap.toLocaleString("en")} tickets sold</p>{cap > 0 && <div className="mt-2 h-2 bg-steel"><div className="h-2 bg-gold" style={{ width: `${Math.min(100, (sold / cap) * 100)}%` }} /></div>}<div className="mt-4 flex flex-wrap gap-2"><Link href={`/admin/events/${next.id}`} className="btn btn-white btn-sm">Edit event</Link><Link href={`/admin/fights/new?eventId=${next.id}`} className="btn btn-ghost btn-sm">Add fight</Link><Link href={`/events/${next.slug}`} className="btn btn-ghost btn-sm">View page</Link></div></>) : <p className="text-sm text-fog">No event scheduled. <Link className="text-gold underline" href="/admin/events/new">Create one</Link>.</p>}
        </section>
        <section className="card p-5" aria-labelledby="q">
          <h2 id="q" className="mb-2 text-2xl">Needs attention</h2>
          <ul className="divide-y divide-line">{queue.filter(([, , , p]) => can(user.role, p)).map(([l, n, h]) => <li key={h}><Link href={h} className="flex items-center justify-between py-2.5 text-sm hover:text-gold"><span>{l}</span><span className={`display text-2xl ${n ? "text-red" : "text-fog"}`}>{n}</span></Link></li>)}</ul>
        </section>
      </div>
      <section aria-labelledby="qa"><h2 id="qa" className="mb-3 text-2xl">Quick actions</h2><div className="flex flex-wrap gap-2">{quick.filter(([, , p]) => can(user.role, p)).map(([l, h]) => <Link key={h} href={h} className="btn btn-ghost btn-sm">{l}</Link>)}</div></section>
      {audit.length > 0 && (
        <section aria-labelledby="au"><div className="mb-3 flex items-end justify-between"><h2 id="au" className="text-2xl">Recent activity</h2><Link href="/admin/audit" className="text-xs font-semibold uppercase tracking-widest text-fog hover:text-gold">Audit log →</Link></div>
          <ul className="card divide-y divide-line text-sm">{audit.map((a) => <li key={a.id} className="flex flex-wrap justify-between gap-2 px-4 py-2.5"><span><span className="font-semibold">{a.user?.name ?? "System"}</span> · {a.action} · {a.resource}{a.detail ? ` — ${a.detail.slice(0, 90)}` : ""}</span><span className="text-fog">{timeAgo(a.createdAt)}</span></li>)}</ul>
        </section>
      )}
    </div>
  );
}
