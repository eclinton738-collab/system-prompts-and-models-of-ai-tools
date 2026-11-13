import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { getFighterCards } from "@/server/services/fighters";
import { fightInclude, hydrateFights } from "@/server/services/fights";
import { FightRow, VideoCard } from "@/components/cards";
import { FaceOff } from "@/components/fight";
import { VoteBar } from "@/components/client/Engage";
import { ShareButtons } from "@/components/client/ShareButtons";
import { Breadcrumbs, Flag } from "@/components/ui";
import { fmtDateShort, fmtMonthShort } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };
const load = (slug: string) => db.rivalry.findUnique({ where: { slug }, include: { moments: { orderBy: { date: "asc" }, include: { video: true } }, event: { include: { country: true } }, fight: { select: { slug: true, status: true } } } });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await load((await params).slug);
  return r ? { title: `${r.title} — The Rivalry`, description: `${r.tagline} ${r.origin}`.slice(0, 160), alternates: { canonical: `/rivalries/${r.slug}` } } : { title: "Rivalry" };
}

export default async function RivalryPage({ params }: Props) {
  const r = await load((await params).slug);
  if (!r) notFound();
  const user = await getCurrentUser();
  const isRegion = r.type === "REGION";
  const [cards, votes, mine] = await Promise.all([
    r.fighterAId && r.fighterBId ? getFighterCards({ id: { in: [r.fighterAId, r.fighterBId] } }) : [],
    db.rivalryVote.groupBy({ by: ["side"], where: { rivalryId: r.id }, _count: true }),
    user ? db.rivalryVote.findUnique({ where: { rivalryId_userId: { rivalryId: r.id, userId: user.id } } }) : null,
  ]);
  const a = cards.find((c) => c.id === r.fighterAId);
  const b = cards.find((c) => c.id === r.fighterBId);

  // Encounters: fighter-vs-fighter bouts, or every bout between fighters of the two regions.
  const regionWhere = (name: string) => ({ OR: [{ state: name }, { city: name }, { country: { name } }] });
  const encounters = await hydrateFights(
    await db.fight.findMany({
      where: isRegion
        ? { OR: [{ fighterA: regionWhere(r.sideA), fighterB: regionWhere(r.sideB) }, { fighterA: regionWhere(r.sideB), fighterB: regionWhere(r.sideA) }] }
        : { OR: [{ fighterAId: r.fighterAId!, fighterBId: r.fighterBId! }, { fighterAId: r.fighterBId!, fighterBId: r.fighterAId! }] },
      include: fightInclude,
      orderBy: { event: { startsAt: "desc" } },
    }),
  );
  const done = encounters.filter((f) => f.status === "COMPLETED");
  const isA = (f: (typeof encounters)[number]["fighterA"]) => (isRegion ? [f.state, f.city, f.country.name].includes(r.sideA) : f.id === r.fighterAId);
  const winsA = done.filter((f) => f.winnerId && isA(f.winnerId === f.fighterA.id ? f.fighterA : f.fighterB)).length;
  const draws = done.filter((f) => !f.winnerId).length;
  const winsB = done.length - winsA - draws;
  const videos = r.moments.filter((m) => m.video).map((m) => m.video!);
  const quotes = r.moments.filter((m) => m.quoteBy);
  const now = Date.now();
  const count = (s: string) => votes.find((v) => v.side === s)?._count ?? 0;

  return (
    <article data-entity-type="rivalry" data-entity-id={r.id}>
      <header className="relative overflow-hidden border-b border-line bg-coal">
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(100deg,rgba(227,24,45,0.32)_0%,transparent_45%,transparent_55%,rgba(246,244,239,0.1)_100%)]" />
        <div className="container-acl relative py-6 sm:py-10">
          <Breadcrumbs items={[{ href: "/rivalries", label: "Rivalries" }, { label: r.title }]} />
          <p className="eyebrow text-center">The rivalry</p>
          <h1 className="mt-1 text-center text-[clamp(2.8rem,10vw,7.5rem)] leading-[0.85]">{r.sideA} <span className="text-red">vs</span> {r.sideB}</h1>
          <p className="display mt-2 text-center text-xl tracking-[0.1em] text-gold sm:text-3xl">{r.tagline}</p>
          {a && b && <div className="mx-auto mt-6 max-w-3xl"><FaceOff a={a} b={b} size="md" /></div>}
          <dl className="mx-auto mt-6 grid max-w-md grid-cols-3 border border-line bg-black/40 text-center">
            <div className="p-3"><dt className="truncate text-[0.62rem] uppercase tracking-widest text-fog">{r.sideA.split(" ").pop()} wins</dt><dd className="display text-4xl text-red">{winsA}</dd></div>
            <div className="border-x border-line p-3"><dt className="text-[0.62rem] uppercase tracking-widest text-fog">Draws</dt><dd className="display text-4xl">{draws}</dd></div>
            <div className="p-3"><dt className="truncate text-[0.62rem] uppercase tracking-widest text-fog">{r.sideB.split(" ").pop()} wins</dt><dd className="display text-4xl">{winsB}</dd></div>
          </dl>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {r.fight && <Link href={`/fights/${r.fight.slug}`} className="btn btn-white">Fight page</Link>}
            {r.event && r.event.status === "SCHEDULED" && <Link href={`/events/${r.event.slug}/tickets`} className="btn btn-red">Get tickets</Link>}
            {r.event && <Link href={`/events/${r.event.slug}`} className="btn btn-ghost">{r.event.name}</Link>}
          </div>
          <div className="mt-5 flex justify-center"><ShareButtons path={`/rivalries/${r.slug}`} title={`${r.title} — ${r.tagline}`} /></div>
        </div>
      </header>

      <div className="container-acl grid gap-10 py-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-12">
          <section aria-labelledby="origin">
            <h2 id="origin" className="mb-3 text-3xl sm:text-4xl">Where it started</h2>
            <p className="max-w-3xl text-lg leading-relaxed text-bone/85">{r.origin}</p>
          </section>

          <section aria-labelledby="timeline">
            <h2 id="timeline" className="mb-6 text-3xl sm:text-4xl">Timeline</h2>
            <ol className="relative ml-3 border-l-2 border-line sm:ml-16">
              {r.moments.map((mo) => {
                const future = mo.date.getTime() > now;
                return (
                  <li key={mo.id} className="relative pb-8 pl-6 last:pb-0 sm:pl-8">
                    <span aria-hidden className={`absolute -left-[9px] top-1 h-4 w-4 rotate-45 ${future ? "border-2 border-gold bg-ink" : "bg-red"}`} />
                    <time dateTime={mo.date.toISOString()} className="display block text-xl tracking-widest text-gold sm:absolute sm:-left-20 sm:top-0 sm:w-14 sm:text-right sm:text-2xl" title={fmtDateShort(mo.date)}>{fmtMonthShort(mo.date)}<span className="ml-1 text-sm text-fog sm:ml-0 sm:block">{mo.date.getUTCFullYear()}</span></time>
                    <span className="chip mb-1.5">{mo.kind}{future ? " · upcoming" : ""}</span>
                    <h3 className="text-2xl">{mo.title}</h3>
                    {mo.quoteBy ? (
                      <blockquote className="mt-2 border-l-2 border-red pl-3"><p className="text-lg italic text-bone/90">{mo.body}</p><footer className="mt-1 text-sm text-fog">— {mo.quoteBy}</footer></blockquote>
                    ) : (
                      <p className="mt-1 max-w-2xl text-bone/80">{mo.body}</p>
                    )}
                    {mo.video && <Link href={`/watch/${mo.video.slug}`} className="mt-2 inline-block text-sm font-semibold uppercase tracking-widest text-gold">▶ Watch: {mo.video.title}</Link>}
                  </li>
                );
              })}
            </ol>
          </section>

          {encounters.length > 0 && (
            <section aria-labelledby="enc">
              <h2 id="enc" className="mb-5 text-3xl sm:text-4xl">{isRegion ? "Head-to-head bouts" : "Fight history"}</h2>
              <div className="space-y-3">{encounters.map((f) => <FightRow key={f.id} fight={f} />)}</div>
            </section>
          )}

          {videos.length > 0 && (
            <section aria-labelledby="rv">
              <h2 id="rv" className="mb-5 text-3xl sm:text-4xl">Face-offs & footage</h2>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">{videos.map((v) => <VideoCard key={v.id} video={v} />)}</div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="card p-5" aria-labelledby="fanvote">
            <p className="eyebrow">Fan vote</p>
            <h2 id="fanvote" className="mb-4 mt-1 text-3xl">Whose side are you on?</h2>
            <VoteBar endpoint={`/api/v1/rivalries/${r.id}/vote`} label="Whose side are you on?" mine={mine?.side ?? null} options={[{ key: "A", label: r.sideA, count: count("A") }, { key: "B", label: r.sideB, count: count("B") }]} />
          </section>
          {r.fight?.status === "SCHEDULED" && (
            <Link href={`/fights/${r.fight.slug}`} className="card card-hover block p-5"><p className="eyebrow">Predictions</p><p className="display mt-1 text-2xl">Pick the winner, method and round →</p></Link>
          )}
          {quotes.length > 0 && (
            <section aria-labelledby="quotes">
              <h2 id="quotes" className="mb-3 text-2xl">They said it</h2>
              <ul className="space-y-3">{quotes.map((q) => <li key={q.id} className="card p-4"><p className="italic">{q.body}</p><p className="mt-2 text-xs text-fog">— {q.quoteBy}</p></li>)}</ul>
            </section>
          )}
          {a && b && (
            <div className="grid grid-cols-2 gap-3">{[a, b].map((f) => <Link key={f.id} href={`/fighters/${f.slug}`} className="btn btn-ghost btn-sm"><Flag code={f.countryCode} /> {f.lastName}</Link>)}</div>
          )}
        </aside>
      </div>
    </article>
  );
}
