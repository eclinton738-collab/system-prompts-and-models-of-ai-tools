import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { fighterName } from "@/server/services/fighters";
import { fightTitle, getFight, listFights, predictionSplit, resultLine, totalStats } from "@/server/services/fights";
import { getAiProvider } from "@/server/integrations/ai";
import { FightRow, VideoCard } from "@/components/cards";
import { CompareBar, FaceOff, TaleOfTape } from "@/components/fight";
import { BeltIcon } from "@/components/media";
import { PredictionWidget } from "@/components/client/Engage";
import { ShareButtons } from "@/components/client/ShareButtons";
import { Countdown } from "@/components/client/Countdown";
import { Breadcrumbs, JsonLd, LiveBadge } from "@/components/ui";
import { age, fmtEventDate, fmtTime, methodLabel } from "@/lib/format";
import { abs } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const f = await getFight(slug);
  if (!f) return { title: "Fight not found" };
  const title = `${fightTitle(f)} — ${f.event.name}`;
  const description = resultLine(f) ?? `${fightTitle(f)}: ${f.division.name}, ${f.rounds} rounds, ${fmtEventDate(f.event.startsAt)} in ${f.event.city}. Tale of the tape, records and fan predictions.`;
  return { title, description, alternates: { canonical: `/fights/${slug}` }, openGraph: { title, description, images: [`/api/og/fight/${slug}`] }, twitter: { card: "summary_large_image", title, description, images: [`/api/og/fight/${slug}`] } };
}

export default async function FightPage({ params }: Props) {
  const { slug } = await params;
  const fight = await getFight(slug);
  if (!fight) notFound();
  const { fighterA: a, fighterB: b, event } = fight;
  const user = await getCurrentUser();
  const [split, mine, allA, gyms] = await Promise.all([
    predictionSplit(fight.id, a.id),
    user ? db.prediction.findUnique({ where: { userId_fightId: { userId: user.id, fightId: fight.id } }, select: { pickFighterId: true, method: true, round: true, correct: true } }) : null,
    listFights({ fighterId: a.id }),
    db.fighter.findMany({ where: { id: { in: [a.id, b.id] } }, select: { id: true, gym: { select: { name: true } } } }),
  ]);
  const previous = allA.filter((x) => x.id !== fight.id && (x.fighterAId === b.id || x.fighterBId === b.id) && x.status === "COMPLETED");
  const sA = totalStats(fight.roundStats, a.id);
  const sB = totalStats(fight.roundStats, b.id);
  const rounds = [...new Set(fight.roundStats.map((s) => s.round))].sort((x, y) => x - y);
  const done = fight.status === "COMPLETED";
  const result = resultLine(fight);
  const ai = getAiProvider();
  const m = (f: typeof a) => ({ name: f.lastName, heightCm: f.heightCm, reachCm: f.reachCm, stance: f.stance, style: f.style, age: age(f.dateOfBirth, event.startsAt), koPct: f.record.koPct, winPct: f.record.winPct, fights: f.record.wins + f.record.losses + f.record.draws });
  const notes = ai.matchupNotes({ a: m(a), b: m(b) });
  const withGym = (f: typeof a) => ({ ...f, gym: gyms.find((g) => g.id === f.id)?.gym });
  const title = fightTitle(fight);

  return (
    <article data-entity-type="fight" data-entity-id={fight.id}>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "SportsEvent", name: title, sport: "Boxing", startDate: event.startsAt.toISOString(), eventStatus: fight.status === "CANCELLED" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled", location: { "@type": "Place", name: event.venue, address: { "@type": "PostalAddress", addressLocality: event.city, addressCountry: event.countryCode } }, competitor: [a, b].map((f) => ({ "@type": "Person", name: fighterName(f), url: abs(`/fighters/${f.slug}`) })), superEvent: { "@type": "SportsEvent", name: event.name, url: abs(`/events/${event.slug}`) }, url: abs(`/fights/${fight.slug}`) }} />
      <header className="relative overflow-hidden border-b border-line bg-coal">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(227,24,45,0.25),transparent_60%)]" />
        <div className="container-acl relative py-6 sm:py-10">
          <Breadcrumbs items={[{ href: "/fights", label: "Fights" }, { href: `/events/${event.slug}`, label: event.name }, { label: title }]} />
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {fight.status === "LIVE" && <LiveBadge />}
            {fight.position !== "UNDERCARD" && <span className="chip chip-red">{fight.position === "MAIN_EVENT" ? "Main event" : "Co-main event"}</span>}
            {fight.isTitleFight && <span className="chip chip-gold"><BeltIcon className="h-3 w-6" /> ACL {fight.division.name} title</span>}
            <span className="chip">{fight.division.name}</span>
            <span className="chip">{fight.rounds} × {fight.roundMinutes} min</span>
            <span className="chip chip-outline">{fight.fightType}</span>
          </div>
          <h1 className="sr-only">{title}</h1>
          <div className="mx-auto max-w-4xl">
            <FaceOff a={a} b={b} winnerId={done ? fight.winnerId : undefined} size="md" />
          </div>
          <div className="mx-auto mt-4 max-w-4xl text-center">
            {done ? (
              <div className="border border-gold/50 bg-black/40 px-4 py-4">
                <p className="eyebrow">Official result</p>
                <p className="display mt-1 text-3xl sm:text-5xl">{result}</p>
              </div>
            ) : fight.status === "LIVE" ? (
              <Link href={`/events/${event.slug}`} className="btn btn-red btn-lg">Follow live scoring</Link>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm font-semibold uppercase tracking-[0.14em]">{fmtEventDate(event.startsAt)} · {fmtTime(event.startsAt)} · {event.venue}, {event.city}</p>
                <Countdown to={event.startsAt.toISOString()} initialMs={event.startsAt.getTime() - Date.now()} size="sm" />
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href={`/events/${event.slug}/tickets`} className="btn btn-red">Get tickets</Link>
                  <Link href={`/events/${event.slug}`} className="btn btn-ghost">Full fight card</Link>
                </div>
              </div>
            )}
          </div>
          <div className="mt-5 flex justify-center"><ShareButtons path={`/fights/${fight.slug}`} title={result ? `${result} | ${event.name}` : `${title} — ${event.name}`} image={`/api/og/fight/${fight.slug}`} /></div>
        </div>
      </header>

      <div className="container-acl grid gap-10 py-8 sm:py-12 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-12">
          <section aria-label="Tale of the tape" className="card px-3 sm:px-8">
            <TaleOfTape a={withGym(a)} b={withGym(b)} at={event.startsAt} />
          </section>

          <section aria-labelledby="h2h">
            <h2 id="h2h" className="mb-5 text-3xl sm:text-4xl">Head to head</h2>
            <div className="card space-y-5 p-4 sm:p-6">
              <div className="flex justify-between text-sm font-semibold uppercase tracking-widest"><span className="text-red">{a.lastName}</span><span>{b.lastName}</span></div>
              <CompareBar labelText="Wins" a={a.record.wins} b={b.record.wins} />
              <CompareBar labelText="Knockouts" a={a.record.kos} b={b.record.kos} />
              <CompareBar labelText="KO percentage" a={a.record.koPct} b={b.record.koPct} suffix="%" />
              <CompareBar labelText="Win percentage" a={a.record.winPct} b={b.record.winPct} suffix="%" />
              <CompareBar labelText="Reach (cm)" a={a.reachCm} b={b.reachCm} />
              <CompareBar labelText="Height (cm)" a={a.heightCm} b={b.heightCm} />
            </div>
          </section>

          {notes.length > 0 && (
            <section aria-labelledby="keys">
              <h2 id="keys" className="mb-2 text-3xl sm:text-4xl">Matchup notes</h2>
              <p className="mb-4 text-xs text-fog">Generated automatically from fighter data by the ACL rules engine{ai.isHeuristic ? " (not a language model)" : ""}.</p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {notes.map((n) => <li key={n} className="card border-l-2 border-l-red p-4 text-sm">{n}</li>)}
              </ul>
            </section>
          )}

          <section aria-labelledby="stats">
            <h2 id="stats" className="mb-5 text-3xl sm:text-4xl">Fight statistics</h2>
            {sA && sB ? (
              <div className="space-y-6">
                <div className="card space-y-5 p-4 sm:p-6">
                  <CompareBar labelText="Total punches landed" a={sA.landed} b={sB.landed} />
                  <CompareBar labelText="Total punches thrown" a={sA.thrown} b={sB.thrown} />
                  <CompareBar labelText="Accuracy" a={sA.accuracy} b={sB.accuracy} suffix="%" />
                  <CompareBar labelText="Jabs landed" a={sA.jabsLanded} b={sB.jabsLanded} />
                  <CompareBar labelText="Power punches landed" a={sA.powerLanded} b={sB.powerLanded} />
                  <CompareBar labelText="Head shots" a={sA.headLanded} b={sB.headLanded} />
                  <CompareBar labelText="Body shots" a={sA.bodyLanded} b={sB.bodyLanded} />
                  <CompareBar labelText="Knockdowns" a={sA.knockdowns} b={sB.knockdowns} />
                </div>
                <div className="card overflow-x-auto">
                  <table className="table-acl min-w-[520px] text-center">
                    <caption className="sr-only">Punches landed of thrown, round by round</caption>
                    <thead><tr><th className="!text-left">Round</th>{rounds.map((r) => <th key={r} className="!text-center">{r}</th>)}</tr></thead>
                    <tbody>
                      {[a, b].map((f) => (
                        <tr key={f.id}>
                          <th scope="row" className="!text-left text-sm font-semibold normal-case tracking-normal text-bone">{f.lastName}</th>
                          {rounds.map((r) => {
                            const s = fight.roundStats.find((x) => x.round === r && x.fighterId === f.id);
                            return <td key={r} className="tabular-nums">{s ? `${s.jabsLanded + s.powerLanded}/${s.jabsThrown + s.powerThrown}` : "—"}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {fight.roundStats.some((s) => s.source === "demo") && <p className="text-xs text-fog">Demo statistics for prototype purposes.</p>}
              </div>
            ) : (
              <p className="card p-5 text-sm text-fog">{done ? "Official punch statistics were not recorded for this bout." : "Punch statistics are published round by round once the fight begins."}</p>
            )}
          </section>

          {fight.scorecards.length > 0 && (
            <section aria-labelledby="cards">
              <h2 id="cards" className="mb-5 text-3xl sm:text-4xl">Judges’ scorecards</h2>
              <ul className="grid gap-3 sm:grid-cols-3">
                {fight.scorecards.map((c) => (
                  <li key={c.id} className="card p-4 text-center">
                    <p className="display text-5xl tabular-nums"><span className={c.scoreA > c.scoreB ? "text-gold" : ""}>{c.scoreA}</span>–<span className={c.scoreB > c.scoreA ? "text-gold" : ""}>{c.scoreB}</span></p>
                    <p className="mt-1 text-xs text-fog">{c.judge}</p>
                    <p className="text-xs font-semibold uppercase tracking-widest">{c.scoreA === c.scoreB ? "Even" : c.scoreA > c.scoreB ? a.lastName : b.lastName}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {previous.length > 0 && (
            <section aria-labelledby="prev">
              <h2 id="prev" className="mb-5 text-3xl sm:text-4xl">Previous meetings</h2>
              <div className="space-y-3">{previous.map((p) => <FightRow key={p.id} fight={p} />)}</div>
            </section>
          )}

          {fight.videos.length > 0 && (
            <section aria-labelledby="vids">
              <h2 id="vids" className="mb-5 text-3xl sm:text-4xl">Watch</h2>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">{fight.videos.map((v) => <VideoCard key={v.id} video={v} />)}</div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <PredictionWidget fightId={fight.id} a={{ id: a.id, name: fighterName(a) }} b={{ id: b.id, name: fighterName(b) }} rounds={fight.rounds} split={split} mine={mine} open={fight.status === "SCHEDULED"} />
          {mine && mine.correct != null && <p className={`card p-3 text-sm font-semibold ${mine.correct ? "text-win" : "text-fog"}`}>{mine.correct ? "You called it. +60 fan points." : "Your pick missed this time."}</p>}
          {fight.rivalries.map((r) => (
            <Link key={r.slug} href={`/rivalries/${r.slug}`} className="card card-hover block p-4">
              <p className="eyebrow">The rivalry</p>
              <p className="display text-2xl">{r.title}</p>
              <p className="mt-1 text-sm text-fog">Timeline, quotes and fan vote →</p>
            </Link>
          ))}
          <div className="card p-4">
            <p className="eyebrow">Event</p>
            <Link href={`/events/${event.slug}`} className="display mt-1 block text-2xl hover:text-gold">{event.name}</Link>
            <p className="mt-1 text-sm text-fog">{fmtEventDate(event.startsAt)}<br />{event.venue}, {event.city}, {event.country.name}</p>
            {!done && <Link href={`/events/${event.slug}/tickets`} className="btn btn-red btn-sm mt-3 w-full">Get tickets</Link>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[a, b].map((f) => <Link key={f.id} href={`/fighters/${f.slug}`} className="btn btn-ghost btn-sm">Follow {f.lastName}</Link>)}
          </div>
          {done && fight.method && <p className="text-xs text-fog">Method: {methodLabel(fight.method)}{fight.endRound ? `, round ${fight.endRound}` : ""}{fight.endTime ? ` at ${fight.endTime}` : ""}.</p>}
        </aside>
      </div>
    </article>
  );
}
