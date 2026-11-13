import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { VoteBar } from "@/components/client/Engage";
import { ApiForm } from "@/components/client/ApiForm";
import { EmptyState, PageHeader, Tabs } from "@/components/ui";
import { label, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Community", description: "The ACL fan community: discussions, fighter Q&As, polls, event threads and fan clubs.", alternates: { canonical: "/community" } };
const CATS = ["DISCUSSION", "FIGHTER_QA", "EVENT", "FAN_CLUB"] as const;

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const cat = CATS.find((c) => c.toLowerCase() === sp.tab);
  const [threads, polls] = await Promise.all([
    db.thread.findMany({ where: { status: "VISIBLE", ...(cat && { category: cat }) }, orderBy: [{ pinned: "desc" }, { createdAt: "desc" }], take: 40, include: { author: { select: { name: true } }, _count: { select: { posts: { where: { status: "VISIBLE" } } } } } }),
    db.poll.findMany({ where: { active: true }, orderBy: { createdAt: "desc" }, take: 3, include: { options: { include: { _count: { select: { votes: true } } } }, votes: user ? { where: { userId: user.id } } : false } }),
  ]);
  return (
    <>
      <PageHeader eyebrow="Fans" title="Community" intro="Talk fights with fans across the continent. Be respectful — threads are moderated.">
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold uppercase tracking-widest">
          <Link href="/predictions" className="text-gold">Fan predictions →</Link>
          <Link href="/leaderboard" className="text-fog hover:text-bone">Leaderboards →</Link>
        </div>
      </PageHeader>
      <div className="container-acl grid gap-10 py-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <Tabs base="/community" active={cat ? cat.toLowerCase() : "all"} tabs={[{ key: "all", label: "All" }, { key: "discussion", label: "Discussions" }, { key: "fighter_qa", label: "Fighter Q&A" }, { key: "event", label: "Events" }, { key: "fan_club", label: "Fan clubs" }]} />
          <ul className="mt-5 space-y-3">
            {threads.map((t) => (
              <li key={t.id}>
                <Link href={`/community/${t.id}`} className="card card-hover block p-4">
                  <div className="mb-1.5 flex flex-wrap gap-1.5">{t.pinned && <span className="chip chip-gold">Pinned</span>}<span className="chip">{label(t.category)}</span>{t.locked && <span className="chip chip-outline">Locked</span>}</div>
                  <p className="display text-2xl leading-none">{t.title}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-fog">{t.body}</p>
                  <p className="mt-2 text-xs uppercase tracking-widest text-fog">{t.author.name} · {timeAgo(t.createdAt)} · {t._count.posts} {t._count.posts === 1 ? "reply" : "replies"}</p>
                </Link>
              </li>
            ))}
          </ul>
          {!threads.length && <div className="mt-5"><EmptyState title="No threads here yet" body="Start the first conversation." /></div>}
        </div>
        <aside className="space-y-6">
          {polls.map((p) => (
            <section key={p.id} className="card p-4" aria-label={p.question}>
              <p className="eyebrow">Poll</p>
              <h2 className="mb-3 mt-1 text-2xl">{p.question}</h2>
              <VoteBar endpoint={`/api/v1/polls/${p.id}/vote`} label={p.question} mine={(p.votes as { optionId: string }[] | undefined)?.[0]?.optionId ?? null} options={p.options.map((o) => ({ key: o.id, label: o.label, count: o._count.votes }))} />
            </section>
          ))}
          <section className="card p-4" aria-labelledby="new-thread">
            <h2 id="new-thread" className="mb-3 text-2xl">Start a thread</h2>
            {user ? (
              <ApiForm endpoint="/api/v1/community/threads" redirectFromData="/community/{id}" submitLabel="Post thread" fields={[{ name: "title", label: "Title", required: true }, { name: "category", label: "Type", type: "select", required: true, options: [{ value: "DISCUSSION", label: "Discussion" }, { value: "EVENT", label: "Event talk" }, { value: "FAN_CLUB", label: "Fan club" }] }, { name: "body", label: "Your post", type: "textarea", required: true, rows: 4 }]} />
            ) : (
              <><p className="text-sm text-fog">Join ACL to post, vote and earn fan points.</p><Link href="/join?next=/community" className="btn btn-red btn-sm mt-3">Join ACL</Link></>
            )}
          </section>
          <p className="text-xs text-fog">Community rules: no abuse, no hate speech, no betting promotion. Report anything that breaks them and a moderator will review it.</p>
        </aside>
      </div>
    </>
  );
}
