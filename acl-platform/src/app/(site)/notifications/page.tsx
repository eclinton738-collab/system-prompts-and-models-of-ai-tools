import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { ActionButton } from "@/components/client/ActionButton";
import { EmptyState, PageHeader } from "@/components/ui";
import { label, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const items = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 60 });
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <>
      <PageHeader eyebrow="Alerts" title="Notifications">
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {unread > 0 && <ActionButton endpoint="/api/v1/notifications/read" label={`Mark all ${unread} as read`} />}
          <Link href="/account/notifications" className="text-sm font-semibold uppercase tracking-widest text-gold">Notification settings →</Link>
        </div>
      </PageHeader>
      <div className="container-acl max-w-3xl py-6 sm:py-10">
        {items.length ? (
          <ul className="space-y-2">
            {items.map((n) => {
              const inner = (<><span className="mb-1 flex items-center gap-2"><span className="chip">{label(n.type)}</span>{!n.readAt && <span className="h-2 w-2 rounded-full bg-red" aria-label="Unread" />}<span className="text-xs text-fog">{timeAgo(n.createdAt)}</span></span><span className="block font-semibold">{n.title}</span><span className="block text-sm text-fog">{n.body}</span></>);
              return <li key={n.id}>{n.url ? <Link href={n.url} className={`card card-hover block p-4 ${n.readAt ? "opacity-70" : ""}`}>{inner}</Link> : <div className={`card p-4 ${n.readAt ? "opacity-70" : ""}`}>{inner}</div>}</li>;
            })}
          </ul>
        ) : <EmptyState title="You are all caught up" body="Follow fighters and turn on alerts to hear about fights, results and ticket releases first." action={{ href: "/fighters", label: "Find fighters to follow" }} />}
      </div>
    </>
  );
}
