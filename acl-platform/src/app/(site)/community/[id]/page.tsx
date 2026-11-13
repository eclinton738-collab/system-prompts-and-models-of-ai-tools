import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { can } from "@/server/permissions";
import { ApiForm } from "@/components/client/ApiForm";
import { ActionButton } from "@/components/client/ActionButton";
import { Breadcrumbs, Flag } from "@/components/ui";
import { label, timeAgo } from "@/lib/format";

type Props = { params: Promise<{ id: string }> };
const load = (id: string) => db.thread.findFirst({ where: { id, status: "VISIBLE" }, include: { author: { select: { name: true, countryCode: true, role: true } }, event: { select: { slug: true, name: true } }, fighter: { select: { slug: true, firstName: true, lastName: true } }, posts: { where: { status: { not: "HIDDEN" } }, orderBy: { createdAt: "asc" }, include: { author: { select: { name: true, countryCode: true, role: true } } } } } });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await load((await params).id);
  return t ? { title: `${t.title} — Community`, description: t.body.slice(0, 160), alternates: { canonical: `/community/${t.id}` } } : { title: "Thread" };
}

export default async function ThreadPage({ params }: Props) {
  const t = await load((await params).id);
  if (!t) notFound();
  const user = await getCurrentUser();
  const mod = can(user?.role, "community.moderate");
  const staff = (role: string) => role !== "FAN" && <span className="chip chip-gold ml-2">{role === "FIGHTER" ? "Fighter" : "ACL"}</span>;
  return (
    <div className="container-acl max-w-4xl py-6 sm:py-10">
      <Breadcrumbs items={[{ href: "/community", label: "Community" }, { label: label(t.category) }]} />
      <h1 className="text-3xl sm:text-5xl">{t.title}</h1>
      <p className="mt-2 text-xs uppercase tracking-widest text-fog"><Flag code={t.author.countryCode} /> {t.author.name}{staff(t.author.role)} · {timeAgo(t.createdAt)}</p>
      <p className="mt-4 whitespace-pre-line text-lg text-bone/90">{t.body}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {t.event && <Link href={`/events/${t.event.slug}`} className="btn btn-ghost btn-sm">{t.event.name}</Link>}
        {t.fighter && <Link href={`/fighters/${t.fighter.slug}`} className="btn btn-ghost btn-sm">{t.fighter.firstName} {t.fighter.lastName}</Link>}
        {user && <ActionButton endpoint="/api/v1/community/report" body={{ threadId: t.id }} label="Report thread" busyLabel="Reporting…" confirm="Report this thread to the moderators?" className="text-xs uppercase tracking-widest text-fog underline" />}
        {mod && <ActionButton endpoint="/api/v1/community/moderate" body={{ threadId: t.id, action: t.locked ? "unlock" : "lock" }} label={t.locked ? "Unlock" : "Lock thread"} />}
        {mod && <ActionButton endpoint="/api/v1/community/moderate" body={{ threadId: t.id, action: "hide" }} label="Hide thread" confirm="Hide this thread from the community?" redirectTo="/community" />}
      </div>
      <h2 className="mb-4 mt-10 text-2xl">{t.posts.length} {t.posts.length === 1 ? "reply" : "replies"}</h2>
      <ol className="space-y-3">
        {t.posts.map((p) => (
          <li key={p.id} className="card p-4">
            <p className="text-xs uppercase tracking-widest text-fog"><Flag code={p.author.countryCode} /> {p.author.name}{staff(p.author.role)} · {timeAgo(p.createdAt)}{p.status === "FLAGGED" && mod ? " · flagged" : ""}</p>
            <p className="mt-2 whitespace-pre-line">{p.body}</p>
            <div className="mt-2 flex gap-3">
              {user && <ActionButton endpoint="/api/v1/community/report" body={{ postId: p.id }} label="Report" busyLabel="…" confirm="Report this reply to the moderators?" className="text-xs uppercase tracking-widest text-fog underline" />}
              {mod && <ActionButton endpoint="/api/v1/community/moderate" body={{ postId: p.id, action: "hide" }} label="Hide" className="text-xs uppercase tracking-widest text-red underline" />}
            </div>
          </li>
        ))}
      </ol>
      <section className="mt-8" aria-labelledby="reply">
        <h2 id="reply" className="mb-3 text-2xl">Reply</h2>
        {t.locked ? <p className="card p-4 text-sm text-fog">This thread is locked.</p> : user ? (
          <ApiForm endpoint="/api/v1/community/posts" extra={{ threadId: t.id }} refresh resetOnSuccess successMessage="Posted." submitLabel="Post reply" fields={[{ name: "body", label: "Your reply", type: "textarea", required: true, rows: 4 }]} />
        ) : (
          <Link href={`/sign-in?next=/community/${t.id}`} className="btn btn-red">Sign in to reply</Link>
        )}
      </section>
    </div>
  );
}
