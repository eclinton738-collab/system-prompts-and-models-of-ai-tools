import Link from "next/link";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import { ActionButton } from "@/components/client/ActionButton";
import { EmptyState } from "@/components/ui";
import { timeAgo } from "@/lib/format";

export const metadata = { title: "Community moderation" };

export default async function ModerationPage() {
  await requirePermission("community.moderate");
  const [reports, hiddenThreads, hiddenPosts] = await Promise.all([
    db.report.findMany({ where: { resolved: false }, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } }, post: { include: { author: { select: { name: true } } } }, thread: { include: { author: { select: { name: true } } } } } }),
    db.thread.findMany({ where: { status: "HIDDEN" }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.post.findMany({ where: { status: "HIDDEN" }, orderBy: { createdAt: "desc" }, take: 20, include: { author: { select: { name: true } } } }),
  ]);
  const ep = "/api/v1/community/moderate";
  return (
    <div className="max-w-4xl">
      <h1 className="text-4xl sm:text-5xl">Community moderation</h1>
      <h2 className="mb-3 mt-6 text-2xl">Open reports ({reports.length})</h2>
      {reports.length ? (
        <ul className="space-y-3">
          {reports.map((r) => {
            const target = r.post ? { postId: r.post.id } : { threadId: r.thread!.id };
            return (
              <li key={r.id} className="card p-4 text-sm">
                <p className="text-xs uppercase tracking-widest text-fog">{r.post ? "Reply" : "Thread"} by {(r.post ?? r.thread)!.author.name} · reported by {r.user.name} · {timeAgo(r.createdAt)}</p>
                <p className="mt-2 whitespace-pre-line">{r.post ? r.post.body : `${r.thread!.title} — ${r.thread!.body}`}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionButton endpoint={ep} body={{ ...target, action: "hide" }} label="Hide content" className="btn btn-sm btn-red" />
                  <ActionButton endpoint={ep} body={{ ...target, action: "restore" }} label="Keep & dismiss report" />
                  <Link href={`/community/${r.post ? r.post.threadId : r.thread!.id}`} className="btn btn-ghost btn-sm">Open thread</Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : <EmptyState title="No open reports" body="Reported threads and replies appear here for review." />}
      <h2 className="mb-3 mt-10 text-2xl">Hidden content</h2>
      {hiddenThreads.length + hiddenPosts.length ? (
        <ul className="card divide-y divide-line text-sm">
          {hiddenThreads.map((t) => <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"><span>Thread: {t.title}</span><ActionButton endpoint={ep} body={{ threadId: t.id, action: "restore" }} label="Restore" /></li>)}
          {hiddenPosts.map((p) => <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"><span className="line-clamp-1">Reply by {p.author.name}: {p.body}</span><ActionButton endpoint={ep} body={{ postId: p.id, action: "restore" }} label="Restore" /></li>)}
        </ul>
      ) : <p className="text-sm text-fog">Nothing is hidden.</p>}
    </div>
  );
}
