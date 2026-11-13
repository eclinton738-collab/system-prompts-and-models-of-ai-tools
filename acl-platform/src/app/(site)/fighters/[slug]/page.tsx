import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { fighterFullName, fighterName, getFighterProfile } from "@/server/services/fighters";
import { listFights, resultLine, totalStats } from "@/server/services/fights";
import { getMoney } from "@/server/services/money";
import { ArticleCard, FightRow, ProductCard, VideoCard } from "@/components/cards";
import { Artwork, BeltIcon, FighterPortrait } from "@/components/media";
import { Form } from "@/components/fight";
import { ToggleButton } from "@/components/client/ActionButton";
import { ShareButtons } from "@/components/client/ShareButtons";
import { Breadcrumbs, EmptyState, Flag, JsonLd, Movement, Stat, Tabs } from "@/components/ui";
import { age, compact, fmtDate, fmtDateShort, height, label, methodLabel, reach } from "@/lib/format";
import { abs } from "@/lib/site";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ tab?: string }> };

const TABS = ["overview", "record", "history", "statistics", "ranking", "titles", "videos", "photos", "news", "social", "biography"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const f = await getFighterProfile(slug);
  if (!f) return { title: "Fighter not found" };
  const title = `${fighterFullName(f)} — ${f.record.wins}–${f.record.losses}–${f.record.draws}, ${f.division.name}`;
  const description = `${fighterName(f)} (${f.country.name}) — ACL ${f.division.name}${f.isChampion ? " champion" : f.ranking ? ` #${f.ranking.rank}` : ""}. Record ${f.record.wins}–${f.record.losses}–${f.record.draws}, ${f.record.kos} KOs. Fight history, stats, videos and news.`;
  return { title, description, alternates: { canonical: `/fighters/${slug}` }, openGraph: { title, description, type: "profile", images: [`/api/og/fighter/${slug}`] }, twitter: { card: "summary_large_image", title, description, images: [`/api/og/fighter/${slug}`] } };
}

export default async function FighterPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const f = await getFighterProfile(slug);
  if (!f) notFound();
  const tab = TABS.includes(sp.tab as never) ? (sp.tab as (typeof TABS)[number]) : "overview";
  const user = await getCurrentUser();
  const [fights, follow, videos, articles, rivalries, m, stats] = await Promise.all([
    listFights({ fighterId: f.id }),
    user ? db.follow.findUnique({ where: { userId_fighterId: { userId: user.id, fighterId: f.id } } }) : null,
    db.video.findMany({ where: { status: "PUBLISHED", fighters: { some: { id: f.id } } }, orderBy: { publishedAt: "desc" }, take: 12 }),
    db.article.findMany({ where: { status: "PUBLISHED", fighters: { some: { id: f.id } } }, orderBy: { publishedAt: "desc" }, take: 6 }),
    db.rivalry.findMany({ where: { OR: [{ fighterAId: f.id }, { fighterBId: f.id }] } }),
    getMoney(),
    db.fightRoundStat.findMany({ where: { fighterId: f.id } }),
  ]);
  const upcoming = fights.filter((x) => x.status !== "COMPLETED").reverse();
  const past = fights.filter((x) => x.status === "COMPLETED");
  const next = upcoming[0];
  const currentReign = f.titleReigns.find((t) => !t.lostAt);
  const r = f.record;
  const punch = totalStats(stats, f.id);
  const roundsFought = past.map((x) => x.endRound ?? x.rounds);
  const avgRounds = roundsFought.length ? (roundsFought.reduce((a, b) => a + b, 0) / roundsFought.length).toFixed(1) : null;
  const base = `/fighters/${f.slug}`;
  const name = fighterName(f);

  const history = (
    <div className="card overflow-x-auto">
      <table className="table-acl min-w-[640px]">
        <caption className="sr-only">ACL fight history for {name}</caption>
        <thead><tr><th>Result</th><th>Opponent</th><th>Method</th><th>Rd</th><th>Time</th><th>Event</th><th>Date</th></tr></thead>
        <tbody>
          {past.map((x) => {
            const opp = x.fighterAId === f.id ? x.fighterB : x.fighterA;
            const res = !x.winnerId ? "D" : x.winnerId === f.id ? "W" : "L";
            return (
              <tr key={x.id}>
                <td><span className={`inline-flex h-6 w-6 items-center justify-center text-xs font-bold ${res === "W" ? "bg-win text-black" : res === "L" ? "bg-red text-white" : "bg-fog text-black"}`}>{res}</span></td>
                <td><Link href={`/fighters/${opp.slug}`} className="font-semibold hover:text-gold"><Flag code={opp.countryCode} /> {fighterName(opp)}</Link>{x.isTitleFight && <span className="chip chip-gold ml-2">Title</span>}</td>
                <td>{methodLabel(x.method)}</td>
                <td className="tabular-nums">{x.endRound ?? x.rounds}</td>
                <td className="tabular-nums">{x.endTime ?? "—"}</td>
                <td><Link href={`/fights/${x.slug}`} className="text-fog hover:text-gold">{x.event.name}</Link></td>
                <td className="whitespace-nowrap text-fog">{fmtDateShort(x.event.startsAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!past.length && <p className="p-4 text-sm text-fog">No completed ACL bouts yet.</p>}
      <p className="border-t border-line p-3 text-xs text-fog">Pre-ACL professional record: {f.priorWins}–{f.priorLosses}–{f.priorDraws} ({f.priorKos} KO). ACL bouts are listed individually above.</p>
    </div>
  );

  return (
    <article data-entity-type="fighter" data-entity-id={f.id}>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Person", name, alternateName: f.nickname ?? undefined, url: abs(base), jobTitle: "Professional boxer", nationality: f.country.name, birthDate: f.dateOfBirth.toISOString().slice(0, 10), height: `${f.heightCm} cm`, image: abs(`/api/og/fighter/${f.slug}`), memberOf: { "@type": "SportsOrganization", name: "Africa Combat League" }, description: f.bio }} />

      {/* Hero */}
      <header className="relative overflow-hidden border-b border-line bg-coal">
        <div aria-hidden className={`absolute inset-0 ${f.isChampion ? "bg-[radial-gradient(ellipse_at_80%_0%,rgba(214,171,59,0.3),transparent_60%)]" : "bg-[radial-gradient(ellipse_at_80%_0%,rgba(227,24,45,0.3),transparent_60%)]"}`} />
        <span aria-hidden className="display pointer-events-none absolute -bottom-8 left-0 whitespace-nowrap text-[28vw] leading-none text-white/[0.03]">{f.lastName}</span>
        <div className="container-acl relative grid gap-6 pt-6 md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] md:items-end lg:grid-cols-[minmax(0,1fr)_28rem]">
          <div className="pb-6 md:pb-10">
            <Breadcrumbs items={[{ href: "/fighters", label: "Fighters" }, { href: `/fighters?division=${f.division.slug}`, label: f.division.name }, { label: name }]} />
            <div className="mb-3 flex flex-wrap gap-2">
              {f.isChampion && <span className="chip chip-gold"><BeltIcon className="h-3 w-6" /> ACL {f.division.name} champion</span>}
              {!f.isChampion && f.ranking && <span className="chip chip-red">#{f.ranking.rank} {f.division.name}</span>}
              <span className="chip">{label(f.status)}</span>
            </div>
            {f.nickname && <p className="display text-2xl tracking-[0.1em] text-gold sm:text-3xl">“{f.nickname}”</p>}
            <h1 className="text-[clamp(3rem,11vw,7.5rem)] leading-[0.82]">
              <span className="block text-[0.45em] font-bold text-bone/80">{f.firstName}</span>
              {f.lastName}
            </h1>
            <p className="mt-3 text-lg"><Flag code={f.countryCode} name={f.country.name} /> {f.country.name}{f.city ? ` · ${f.city}${f.state && f.state !== f.city ? `, ${f.state}` : ""}` : ""}</p>

            <dl className="mt-5 grid max-w-xl grid-cols-4 gap-2">
              {[["Pro record", `${r.wins}–${r.losses}–${r.draws}`], ["KO", r.kos], ["Rank", f.isChampion ? "C" : f.ranking ? `#${f.ranking.rank}` : "NR"], ["Followers", compact(f.followers)]].map(([k, v]) => (
                <div key={k as string} className="border border-white/15 bg-black/40 px-2 py-2 text-center sm:px-3">
                  <dt className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-fog">{k}</dt>
                  <dd className="display text-2xl sm:text-4xl">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 flex flex-wrap gap-2">
              <ToggleButton endpoint="/api/v1/follows" body={{ fighterId: f.id }} initial={!!follow} onLabel="Following ✓" offLabel="Follow fighter" className="btn" />
              <ToggleButton endpoint="/api/v1/follows/notify" body={{ fighterId: f.id }} initial={!!follow?.notify} onLabel="Alerts on 🔔" offLabel="Notify me" className="btn" onClass="btn-gold" offClass="btn-ghost" />
              {next && <Link href={`/events/${next.event.slug}/tickets`} className="btn btn-ghost">Tickets</Link>}
            </div>
            <div className="mt-4"><ShareButtons path={base} title={`${fighterFullName(f)} — ${r.wins}–${r.losses}–${r.draws}, ${r.kos} KO`} image={`/api/og/fighter/${f.slug}`} /></div>
          </div>
          <div className="relative mx-auto aspect-[4/5] w-full max-w-sm self-end overflow-hidden md:max-w-none">
            <FighterPortrait fighter={f} champion={f.isChampion} priority />
          </div>
        </div>
      </header>

      <div className="container-acl">
        <Tabs base={base} active={tab} tabs={TABS.map((t) => ({ key: t, label: t === "history" ? "Fight history" : label(t) }))} />
      </div>

      <div className="container-acl py-8 sm:py-10">
        {tab === "overview" && (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-10">
              {f.quote && (
                <blockquote className="border-l-4 border-red pl-4 sm:pl-6">
                  <p className="display text-2xl leading-tight sm:text-4xl">“{f.quote}”</p>
                  <footer className="mt-2 text-sm text-fog">— {name}</footer>
                </blockquote>
              )}
              <section aria-labelledby="next-fight">
                <h2 id="next-fight" className="mb-4 text-3xl">Next fight</h2>
                {next ? <FightRow fight={next} /> : <EmptyState title="No fight booked" body={`Follow ${f.firstName} to be notified the moment the next bout is announced.`} />}
              </section>
              <section aria-labelledby="story">
                <h2 id="story" className="mb-3 text-3xl">The story</h2>
                <p className="max-w-3xl leading-relaxed text-bone/85">{f.bio}</p>
                <Link href={`${base}?tab=biography`} scroll={false} className="mt-3 inline-block text-sm font-semibold uppercase tracking-widest text-gold">Read full biography →</Link>
              </section>
              {rivalries.length > 0 && (
                <section aria-labelledby="rivalries">
                  <h2 id="rivalries" className="mb-4 text-3xl">Rivalries</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {rivalries.map((rv) => (
                      <Link key={rv.id} href={`/rivalries/${rv.slug}`} className="card card-hover p-4">
                        <p className="display text-2xl">{rv.sideA} <span className="text-red">vs</span> {rv.sideB}</p>
                        <p className="mt-1 text-sm text-fog">{rv.tagline}</p>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
              {videos.length > 0 && (
                <section aria-labelledby="highlights">
                  <div className="mb-4 flex items-end justify-between"><h2 id="highlights" className="text-3xl">Highlights & interviews</h2><Link href={`${base}?tab=videos`} scroll={false} className="text-sm font-semibold uppercase tracking-widest text-fog hover:text-gold">All videos →</Link></div>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{videos.slice(0, 3).map((v) => <VideoCard key={v.id} video={v} />)}</div>
                </section>
              )}
              {past.length > 0 && (
                <section aria-labelledby="recent">
                  <h2 id="recent" className="mb-4 text-3xl">Recent results</h2>
                  <div className="space-y-3">{past.slice(0, 2).map((x) => <FightRow key={x.id} fight={x} />)}</div>
                </section>
              )}
            </div>
            <aside className="space-y-6">
              <div className="card p-4">
                <h2 className="mb-3 text-2xl">Vitals</h2>
                <dl className="divide-y divide-line text-sm">
                  {[
                    ["Age", `${age(f.dateOfBirth)}`], ["Height", height(f.heightCm)], ["Reach", reach(f.reachCm)], ["Stance", label(f.stance)], ["Style", f.style], ["Division", f.division.name],
                    ["Pro debut", f.proDebut ? String(f.proDebut.getUTCFullYear()) : "—"], ["Recent form", <Form key="f" form={r.form} />],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex items-center justify-between gap-3 py-2"><dt className="text-fog">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
                  ))}
                  <div className="flex items-center justify-between gap-3 py-2"><dt className="text-fog">Gym</dt><dd className="text-right font-semibold">{f.gym ? <Link href={`/gyms/${f.gym.slug}`} className="hover:text-gold">{f.gym.name}</Link> : "—"}</dd></div>
                  <div className="flex items-center justify-between gap-3 py-2"><dt className="text-fog">Coach</dt><dd className="text-right font-semibold">{f.coach?.name ?? "—"}</dd></div>
                </dl>
              </div>
              {f.products.length > 0 && (
                <div>
                  <h2 className="mb-3 text-2xl">Official merchandise</h2>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 xl:grid-cols-2">{f.products.map((p) => <ProductCard key={p.id} product={p} price={m.fmt(p.priceMinor, p.currency)} />)}</div>
                </div>
              )}
            </aside>
          </div>
        )}

        {tab === "record" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Wins" value={r.wins} accent /><Stat label="Losses" value={r.losses} /><Stat label="Draws" value={r.draws} /><Stat label="KO / TKO" value={r.kos} sub={`${r.koPct}% of wins`} />
            </div>
            <div className="card p-4">
              <p className="label">How the wins came</p>
              <div className="flex h-8 overflow-hidden" role="img" aria-label={`${r.kos} wins by knockout, ${r.decisionWins} by decision`}>
                {r.kos > 0 && <span className="flex items-center justify-center bg-red text-xs font-bold" style={{ width: `${(r.kos / Math.max(1, r.wins)) * 100}%` }}>{r.kos} KO/TKO</span>}
                {r.decisionWins > 0 && <span className="flex flex-1 items-center justify-center bg-bone text-xs font-bold text-black">{r.decisionWins} DEC</span>}
              </div>
            </div>
            {history}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-8">
            {upcoming.length > 0 && <section><h2 className="mb-4 text-3xl">Upcoming</h2><div className="space-y-3">{upcoming.map((x) => <FightRow key={x.id} fight={x} />)}</div></section>}
            <section><h2 className="mb-4 text-3xl">Previous ACL fights</h2>{past.length ? <div className="grid gap-3 lg:grid-cols-2">{past.map((x) => <FightRow key={x.id} fight={x} />)}</div> : <EmptyState title="No ACL fights yet" />}</section>
          </div>
        )}

        {tab === "statistics" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Stat label="Wins" value={r.wins} /><Stat label="Losses" value={r.losses} /><Stat label="Draws" value={r.draws} /><Stat label="KO / TKO" value={r.kos} /><Stat label="Decision wins" value={r.decisionWins} />
              <Stat label="KO percentage" value={`${r.koPct}%`} accent /><Stat label="Win percentage" value={`${r.winPct}%`} /><Stat label="Avg. fight length" value={avgRounds ?? "—"} sub={avgRounds ? "rounds, ACL bouts" : "No ACL bouts yet"} />
              <Stat label="Knockdowns scored" value={punch ? punch.knockdowns : "—"} sub={punch ? "Tracked bouts" : "Not yet tracked"} /><Stat label="Performance bonuses" value={r.bonuses} />
            </div>
            <section className="card p-4 sm:p-6">
              <h2 className="mb-1 text-2xl">Punch statistics</h2>
              {punch ? (
                <>
                  <p className="mb-4 text-sm text-fog">Totals across {new Set(stats.map((s) => s.fightId)).size} tracked ACL {new Set(stats.map((s) => s.fightId)).size === 1 ? "bout" : "bouts"}.</p>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                    {[["Punches landed / thrown", `${punch.landed} / ${punch.thrown}`], ["Accuracy", `${punch.accuracy}%`], ["Jabs landed / thrown", `${punch.jabsLanded} / ${punch.jabsThrown}`], ["Power landed / thrown", `${punch.powerLanded} / ${punch.powerThrown}`], ["Head shots landed", punch.headLanded], ["Body shots landed", punch.bodyLanded]].map(([k, v]) => (
                      <div key={k as string}><dt className="text-xs uppercase tracking-widest text-fog">{k}</dt><dd className="display text-3xl">{v}</dd></div>
                    ))}
                  </dl>
                </>
              ) : (
                <p className="text-sm text-fog">Punch-by-punch statistics have not been recorded for this fighter’s bouts yet. They appear automatically once official statistics are supplied.</p>
              )}
            </section>
          </div>
        )}

        {tab === "ranking" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card p-5">
              <p className="label">{f.division.name}</p>
              <p className="display text-7xl text-gold">{f.isChampion ? "Champion" : f.ranking ? `#${f.ranking.rank}` : "Unranked"}</p>
              {f.ranking && !f.isChampion && <p className="mt-2 flex items-center gap-2 text-sm text-fog">Movement since last update: <Movement rank={f.ranking.rank} previous={f.ranking.previousRank} /></p>}
              {f.ranking && <p className="mt-1 text-xs text-fog">Updated {fmtDate(f.ranking.updatedAt)}</p>}
              <Link href={`/rankings?division=${f.division.slug}`} className="btn btn-ghost btn-sm mt-4">Full {f.division.name} rankings</Link>
            </div>
            <div className="card p-5">
              <p className="label">Road to the title</p>
              <p className="text-sm text-fog">{f.isChampion ? `${f.firstName} holds the belt. Every ranked contender is chasing.` : f.ranking ? `${f.firstName} is ${f.ranking.rank === 1 ? "next in line" : `${f.ranking.rank} ${f.ranking.rank === 2 ? "places" : "places"} from the top contender spot`}.` : `${f.firstName} needs wins to break into the top ten.`}</p>
              <Link href={`/champions/${f.division.slug}`} className="btn btn-ghost btn-sm mt-4">{f.division.name} title picture</Link>
            </div>
          </div>
        )}

        {tab === "titles" && (
          f.titleReigns.length ? (
            <ul className="space-y-3">
              {f.titleReigns.map((t) => (
                <li key={t.id} className="card flex flex-wrap items-center gap-4 p-4">
                  <BeltIcon className="h-10 w-20" />
                  <div className="flex-1">
                    <p className="display text-2xl">ACL {t.division.name} Champion</p>
                    <p className="text-sm text-fog">{fmtDate(t.wonAt)} — {t.lostAt ? fmtDate(t.lostAt) : "present"}{t.note ? ` · ${t.note}` : ""}</p>
                  </div>
                  {!t.lostAt && <span className="chip chip-gold">Reigning</span>}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No titles yet" body={`${f.firstName} has not held an ACL championship.`} action={{ href: `/champions/${f.division.slug}`, label: "See the title picture" }} />
          )
        )}

        {tab === "videos" && (videos.length ? <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{videos.map((v) => <VideoCard key={v.id} video={v} />)}</div> : <EmptyState title="No videos yet" action={{ href: "/watch", label: "Browse ACL Watch" }} />)}

        {tab === "photos" && (
          f.photos.length ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {f.photos.map((p) => (
                <figure key={p.id} className="card overflow-hidden"><div className="aspect-square"><Artwork src={p.url} alt={p.caption} /></div><figcaption className="p-2 text-xs text-fog">{p.caption}{p.credit ? ` · ${p.credit}` : ""}</figcaption></figure>
              ))}
            </div>
          ) : (
            <EmptyState title="No photos published yet" body="Official photography is added to the gallery after each event and media day." />
          )
        )}

        {tab === "news" && (articles.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{articles.map((a) => <ArticleCard key={a.id} article={a} />)}</div> : <EmptyState title="No news yet" action={{ href: "/news", label: "ACL Newsroom" }} />)}

        {tab === "social" && (
          <div className="grid gap-4 sm:grid-cols-3">
            {([["Instagram", f.instagram, "https://instagram.com/"], ["X", f.xHandle, "https://x.com/"], ["TikTok", f.tiktok, "https://tiktok.com/@"]] as const).map(([net, handle, url]) => (
              <div key={net} className="card p-5">
                <p className="label">{net}</p>
                {handle ? <a href={`${url}${handle}`} target="_blank" rel="noopener noreferrer" className="display text-2xl hover:text-gold">@{handle}</a> : <p className="text-fog">Not listed</p>}
              </div>
            ))}
            <div className="card p-5 sm:col-span-3">
              <p className="label">ACL fan following</p>
              <p className="display text-5xl text-gold">{f.followers.toLocaleString("en")}</p>
              <p className="mt-1 text-sm text-fog">fans follow {f.firstName} on ACL</p>
            </div>
          </div>
        )}

        {tab === "biography" && (
          <div className="prose-acl max-w-3xl">
            {(f.story ?? f.bio).split(/\n\n+/).map((p, i) => <p key={i}>{p}</p>)}
          </div>
        )}
      </div>
    </article>
  );
}
