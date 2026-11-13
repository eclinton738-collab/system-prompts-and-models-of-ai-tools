import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import { ApiForm } from "@/components/client/ApiForm";
import { flag, label, timeAgo } from "@/lib/format";

export const metadata = { title: "Notifications" };
const TYPES = ["FIGHT_ANNOUNCEMENT", "FIGHTER_FIGHT", "EVENT_REMINDER", "RESULT", "RANKING", "BREAKING_NEWS", "TICKET_RELEASE", "MERCH_DROP", "NEW_VIDEO"];

export default async function AdminNotificationsPage() {
  await requirePermission("notifications.send");
  const [fighters, countries, log, total, unread] = await Promise.all([
    db.fighter.findMany({ orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true, _count: { select: { followers: true } } } }),
    db.country.findMany({ where: { users: { some: {} } }, orderBy: { name: "asc" } }),
    db.auditLog.findMany({ where: { action: "broadcast" }, orderBy: { createdAt: "desc" }, take: 10, include: { user: { select: { name: true } } } }),
    db.notification.count(), db.notification.count({ where: { readAt: null } }),
  ]);
  return (
    <div className="max-w-4xl">
      <h1 className="text-4xl sm:text-5xl">Notifications</h1>
      <p className="mb-6 mt-1 text-sm text-fog">{total.toLocaleString("en")} delivered in-app · {unread.toLocaleString("en")} unread. Fans who switched a category off will not receive it. Fight announcements, results, rankings changes, ticket releases and new videos are also sent automatically when you publish them in the CMS.</p>
      <div className="card p-5 sm:p-6">
        <h2 className="mb-4 text-2xl">Send a broadcast</h2>
        <ApiForm endpoint="/api/v1/admin/notifications" resetOnSuccess refresh submitLabel="Send notification" successMessage="Notification sent."
          fields={[
            { name: "audience", label: "Audience", type: "select", required: true, half: true, options: [{ value: "all", label: "All members" }, { value: "followers", label: "Followers of a fighter" }, { value: "country", label: "Members in a country" }, { value: "premium", label: "Premium members" }] },
            { name: "type", label: "Category", type: "select", required: true, half: true, options: TYPES.map((t) => ({ value: t, label: label(t) })) },
            { name: "fighterId", label: "Fighter (for follower audience)", type: "select", half: true, options: fighters.map((f) => ({ value: f.id, label: `${f.firstName} ${f.lastName} (${f._count.followers})` })) },
            { name: "countryCode", label: "Country (for country audience)", type: "select", half: true, options: countries.map((c) => ({ value: c.code, label: `${flag(c.code)} ${c.name}` })) },
            { name: "title", label: "Title", required: true }, { name: "body", label: "Message", type: "textarea", required: true, rows: 3 }, { name: "url", label: "Link (site path)", placeholder: "/events/acl-state-wars-001", help: "Optional. Must start with /." },
          ]} />
      </div>
      <h2 className="mb-3 mt-8 text-2xl">Recent broadcasts</h2>
      {log.length ? <ul className="card divide-y divide-line text-sm">{log.map((l) => <li key={l.id} className="flex flex-wrap justify-between gap-2 px-4 py-2.5"><span>{l.detail}</span><span className="text-fog">{l.user?.name} · {timeAgo(l.createdAt)}</span></li>)}</ul> : <p className="text-sm text-fog">No broadcasts sent yet.</p>}
    </div>
  );
}
