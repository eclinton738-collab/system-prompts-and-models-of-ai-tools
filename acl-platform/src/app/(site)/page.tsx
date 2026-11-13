import Link from "next/link";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { getHeadlineEvent } from "@/server/services/events";
import { listFights } from "@/server/services/fights";
import { getChampions, getCountryRankings } from "@/server/services/rankings";
import { getTrendingFighters } from "@/server/services/fighters";
import { getMapData } from "@/server/services/map";
import { getMoney } from "@/server/services/money";
import { getPoints } from "@/server/services/engagement";
import { ArticleCard, FighterCardView, FightRow, ProductCard, VideoCard } from "@/components/cards";
import { FaceOff, TaleOfTape } from "@/components/fight";
import { AfricaMap } from "@/components/AfricaMap";
import { Artwork, BeltIcon, FighterPortrait } from "@/components/media";
import { Countdown } from "@/components/client/Countdown";
import { EmptyState, Flag, JsonLd, LiveBadge, SectionHeader } from "@/components/ui";
import { fanRank, fmtEventDate, fmtTime, money } from "@/lib/format";
import { SITE, abs } from "@/lib/site";

export default async function HomePage() {
  const user = await getCurrentUser();
  const [event, upcoming, results, champions, trending, videos, articles, rivalries, map, countries, originals, products, m] = await Promise.all([
    getHeadlineEvent(),
    listFights({ status: "SCHEDULED", take: 6 }),
    listFights({ status: "COMPLETED", take: 4 }),
    getChampions(),
    getTrendingFighters(6),
    db.video.findMany({ where: { status: "PUBLISHED", seriesId: null }, orderBy: { publishedAt: "desc" }, take: 10 }),
    db.article.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ publishedAt: "desc" }], take: 5 }),
    db.rivalry.findMany({ orderBy: [{ featured: "desc" }, { title: "asc" }], take: 4, include: { _count: { select: { votes: true, moments: true } } } }),
    getMapData(),
    getCountryRankings(),
    db.series.findMany({ orderBy: { sortOrder: "asc" }, take: 4, include: { videos: { take: 1, orderBy: { episode: "asc" } } } }),
    db.product.findMany({ where: { active: true, inventory: { gt: 0 } }, orderBy: [{ limited: "desc" }, { createdAt: "desc" }], take: 4 }),
    getMoney(),
  ]);
  const main = event?.fights.find((f) => f.position === "MAIN_EVENT") ?? event?.fights[0];
  const trailer = event ? await db.video.findFirst({ where: { eventId: event.id, title: { contains: "trailer", mode: "insensitive" } }, select: { slug: true } }) : null;
  const cheapest = event ? await db.ticketType.findFirst({ where: { eventId: event.id, salesOpen: true }, orderBy: { priceMinor: "asc" } }) : null;
  const live = event?.status === "LIVE";

  // "Your ACL" — personalised strip for signed-in fans
  const yours = user
    ? await Promise.all([
        db.follow.findMany({ where: { userId: user.id }, select: { fighterId: true, fighter: { select: { slug: true, firstName: true, lastName: true, photoUrl: true } } }, take: 8 }),
        getPoints(user.id),
        db.prediction.count({ where: { userId: user.id, correct: null } }),
      ])
    : null;
  const yourFights = yours?.[0].length ? upcoming.filter((f) => yours[0].some((x) => x.fighterId === f.fighterAId || x.fighterId === f.fighterBId)) : [];

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "SportsOrganization", name: SITE.name, alternateName: SITE.short, url: SITE.url, sport: "Boxing", description: SITE.description }} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", name: SITE.name, url: SITE.url, potentialAction: { "@type": "SearchAction", target: `${abs("/search")}?q={search_term_string}`, "query-input": "required name=search_term_string" } }} />

      {/* 1–3. Hero event, main fight, countdown */}
      {event && main ? (
        <section aria-labelledby="hero-title" className="relative overflow-hidden border-b border-line bg-ink">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(227,24,45,0.28),transparent_60%)]" />
          <div aria-hidden className="slash-bg absolute inset-0" />
          <div className="container-acl relative grid gap-6 py-6 sm:py-10 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-10 lg:py-14">
            <div className="animate-rise">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {live ? <LiveBadge label="Live now" /> : <span className="chip chip-red">Next event</span>}
                {event.number && <span className="chip chip-outline">Event {event.number}</span>}
              </div>
              <p className="eyebrow">{event.name.split(":")[0]}</p>
              <h1 id="hero-title" className="mt-1 text-[clamp(3.2rem,13vw,8.5rem)] leading-[0.82]">
                {event.sideA && event.sideB ? (
                  <>
                    {event.sideA} <span className="text-red">vs</span> {event.sideB}
                  </>
                ) : (
                  event.name.split(":").slice(1).join(":").trim() || event.name
                )}
              </h1>
              {event.tagline && <p className="display mt-3 text-2xl tracking-[0.12em] text-gold sm:text-4xl">{event.tagline}</p>}
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] sm:text-base">
                {fmtEventDate(event.startsAt)} · {fmtTime(event.startsAt)}
              </p>
              <p className="mt-1 text-sm text-fog sm:text-base">
                <Flag code={event.countryCode} name={event.country.name} /> {event.venue}, {event.city}, {event.country.name}
              </p>
              {!live && (
                <div className="mt-5">
                  <Countdown to={event.startsAt.toISOString()} initialMs={event.startsAt.getTime() - Date.now()} />
                </div>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                {live ? (
                  <Link href={`/events/${event.slug}`} className="btn btn-red btn-lg">Follow live</Link>
                ) : (
                  <Link href={`/events/${event.slug}/tickets`} className="btn btn-red btn-lg">Get tickets</Link>
                )}
                <Link href={`/events/${event.slug}`} className="btn btn-white btn-lg">View fight card</Link>
                {trailer && <Link href={`/watch/${trailer.slug}`} className="btn btn-ghost btn-lg">▶ Watch trailer</Link>}
              </div>
              {cheapest && !live && <p className="mt-3 text-xs text-fog">Tickets from {m.fmt(cheapest.priceMinor, cheapest.currency)}</p>}
            </div>
            <div className="relative">
              <FaceOff a={main.fighterA} b={main.fighterB} />
              <Link href={`/fights/${main.slug}`} className="mt-2 flex items-center justify-between gap-3 border border-line bg-coal px-4 py-3 text-sm hover:border-gold">
                <span>
                  <span className="font-semibold uppercase tracking-widest text-red">Main event</span>
                  <span className="text-fog"> · {main.division.name} · {main.rounds} rounds{main.isTitleFight ? " · Title fight" : ""}</span>
                </span>
                <span className="shrink-0 font-semibold uppercase tracking-widest text-gold">Fight page →</span>
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="container-acl py-16">
          <EmptyState title="The next ACL event will be announced soon" body="Join ACL to be the first to know when tickets go on sale." action={{ href: "/join", label: "Join ACL" }} />
        </section>
      )}

      {/* Your ACL */}
      {user && yours && (
        <section aria-labelledby="your-acl" className="border-b border-line bg-coal">
          <div className="container-acl flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="eyebrow">Your ACL</p>
              <h2 id="your-acl" className="text-2xl sm:text-3xl">Welcome back, {user.name.split(" ")[0]}</h2>
              <p className="mt-1 text-sm text-fog">
                {fanRank(yours[1]).name} · {yours[1].toLocaleString("en")} fan points · {yours[2]} open {yours[2] === 1 ? "prediction" : "predictions"}
              </p>
            </div>
            {yours[0].length ? (
              <div className="flex items-center gap-3 overflow-x-auto">
                {yours[0].map((f) => (
                  <Link key={f.fighterId} href={`/fighters/${f.fighter.slug}`} className="w-14 shrink-0 text-center" title={`${f.fighter.firstName} ${f.fighter.lastName}`}>
                    <span className="block h-14 w-14 overflow-hidden rounded-full border border-line bg-steel"><FighterPortrait fighter={f.fighter} /></span>
                    <span className="mt-1 block truncate text-[0.65rem] text-fog">{f.fighter.lastName}</span>
                  </Link>
                ))}
                <Link href="/account" className="btn btn-ghost btn-sm shrink-0">My passport</Link>
              </div>
            ) : (
              <Link href="/fighters" className="btn btn-ghost btn-sm self-start">Follow fighters to personalise your feed</Link>
            )}
          </div>
          {yourFights.length > 0 && (
            <div className="container-acl pb-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-fog">Fighters you follow — next up</p>
              <div className="grid gap-3 lg:grid-cols-2">{yourFights.slice(0, 2).map((f) => <FightRow key={f.id} fight={f} />)}</div>
            </div>
          )}
        </section>
      )}

      {/* 2. Next major fight */}
      {main && event && (
        <section className="container-acl py-12 sm:py-16">
          <SectionHeader eyebrow={`${main.division.name} · ${main.fightType}`} title={`${main.fighterA.lastName} vs ${main.fighterB.lastName}`} href={`/fights/${main.slug}`} linkLabel="Full breakdown" />
          <div className="card px-3 sm:px-8">
            <TaleOfTape a={main.fighterA} b={main.fighterB} at={event.startsAt} />
          </div>
        </section>
      )}

      {/* 4. Upcoming fights */}
      <section className="container-acl pb-12 sm:pb-16">
        <SectionHeader eyebrow="Fight center" title="Upcoming fights" href="/fights" />
        {upcoming.length ? (
          <div className="grid gap-3 lg:grid-cols-2">{upcoming.map((f) => <FightRow key={f.id} fight={f} />)}</div>
        ) : (
          <EmptyState title="No fights scheduled" body="New bouts are announced in ACL News." action={{ href: "/news", label: "Read the news" }} />
        )}
      </section>

      {/* 5. Champions */}
      <section className="border-y border-line bg-coal py-12 sm:py-16">
        <div className="container-acl">
          <SectionHeader eyebrow="The belts" title="ACL champions" href="/champions" />
          <div className="rail auto-cols-[62%] sm:auto-cols-[38%] md:auto-cols-[28%] lg:auto-cols-[22%] xl:grid-flow-row xl:auto-cols-auto xl:grid-cols-4">
            {champions.map((c) =>
              c.fighter ? (
                <div key={c.division.id}>
                  <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gold">
                    <BeltIcon className="h-4 w-8" /> {c.division.name}
                  </p>
                  <FighterCardView fighter={c.fighter} />
                </div>
              ) : (
                <div key={c.division.id} className="card flex aspect-[4/5] flex-col items-center justify-center p-4 text-center">
                  <BeltIcon className="h-8 w-16 opacity-40" />
                  <p className="display mt-3 text-xl">{c.division.name}</p>
                  <p className="text-sm text-fog">Title vacant</p>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* 6. Latest results */}
      <section className="container-acl py-12 sm:py-16">
        <SectionHeader eyebrow="Final bell" title="Latest results" href="/fights?tab=completed" />
        {results.length ? <div className="grid gap-3 lg:grid-cols-2">{results.map((f) => <FightRow key={f.id} fight={f} />)}</div> : <EmptyState title="No results yet" />}
      </section>

      {/* 7. Trending fighters */}
      <section className="container-acl pb-12 sm:pb-16">
        <SectionHeader eyebrow="Most followed" title="Trending fighters" href="/fighters" />
        <div className="rail auto-cols-[58%] sm:auto-cols-[36%] md:auto-cols-[27%] lg:grid-flow-row lg:auto-cols-auto lg:grid-cols-6">
          {trending.map((f) => <FighterCardView key={f.id} fighter={f} followers={f.followers} />)}
        </div>
      </section>

      {/* 8. ACL Watch */}
      <section className="border-y border-line bg-coal py-12 sm:py-16">
        <div className="container-acl">
          <SectionHeader eyebrow="ACL Watch" title="Fights, highlights, access" href="/watch" linkLabel="Open Watch" />
          <div className="rail">{videos.map((v) => <VideoCard key={v.id} video={v} wide />)}</div>
        </div>
      </section>

      {/* 9. Latest news */}
      <section className="container-acl py-12 sm:py-16">
        <SectionHeader eyebrow="Newsroom" title="Latest news" href="/news" />
        {articles.length ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 lg:row-span-2"><ArticleCard article={articles[0]} large /></div>
            {articles.slice(1, 5).map((a) => (
              <Link key={a.id} href={`/news/${a.slug}`} className="card card-hover flex flex-col p-4 lg:[&:nth-child(n+4)]:hidden xl:[&:nth-child(n+4)]:flex">
                <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-gold">{a.category.replace(/_/g, " ")}</span>
                <span className="display mt-1 text-xl leading-none">{a.title}</span>
                <span className="mt-2 line-clamp-2 text-sm text-fog">{a.excerpt}</span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="No stories published yet" />
        )}
      </section>

      {/* 10. Rivalries */}
      <section className="container-acl pb-12 sm:pb-16">
        <SectionHeader eyebrow="The rivalry engine" title="Bad blood" href="/rivalries" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {rivalries.map((r) => (
            <Link key={r.id} href={`/rivalries/${r.slug}`} className="card card-hover relative overflow-hidden p-5">
              <span aria-hidden className="display absolute -right-2 -top-4 text-8xl text-white/5">VS</span>
              <span className="chip mb-3">{r.type === "REGION" ? "State / nation war" : "Fighter rivalry"}</span>
              <p className="display text-3xl leading-[0.9]">{r.sideA} <span className="text-red">vs</span> {r.sideB}</p>
              <p className="mt-2 line-clamp-2 text-sm text-fog">{r.tagline}</p>
              <p className="mt-3 text-xs uppercase tracking-widest text-fog">{r._count.moments} chapters · {r._count.votes} fan votes</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 11. Africa combat map */}
      <section className="border-y border-line bg-coal py-12 sm:py-16">
        <div className="container-acl grid items-center gap-8 lg:grid-cols-2">
          <div>
            <SectionHeader eyebrow="Africa-first" title="Africa combat map" />
            <p className="-mt-2 max-w-lg text-fog">Explore fighters and gyms country by country. Rankings below are calculated from live league data: champions, contenders, wins and affiliated gyms.</p>
            <ol className="mt-6 divide-y divide-line border-y border-line">
              {countries.slice(0, 5).map((c, i) => (
                <li key={c.country.code}>
                  <Link href={`/map/${c.country.code.toLowerCase()}`} className="flex items-center gap-4 py-3 hover:text-gold">
                    <span className="display w-8 text-3xl text-red">{i + 1}</span>
                    <span className="flex-1 font-semibold"><Flag code={c.country.code} /> {c.country.name}</span>
                    <span className="text-sm text-fog">{c.champions} {c.champions === 1 ? "champion" : "champions"} · {c.fighters} fighters</span>
                  </Link>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/map" className="btn btn-white">Open the map</Link>
              <Link href="/rankings/countries" className="btn btn-ghost">Country rankings</Link>
            </div>
          </div>
          <AfricaMap data={map.byNumeric} className="mx-auto w-full max-w-lg" />
        </div>
      </section>

      {/* 12. ACL Originals */}
      <section className="container-acl py-12 sm:py-16">
        <SectionHeader eyebrow="ACL Originals" title="Stories behind the fights" href="/originals" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {originals.map((s, i) => (
            <Link key={s.id} href={s.videos[0] ? `/watch/${s.videos[0].slug}` : "/originals"} className="group relative block aspect-[3/4] overflow-hidden border border-line hover:border-gold">
              <Artwork alt="" seed={s.slug} tone="gold" />
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black via-black/40 to-transparent p-3 sm:p-4">
                <span className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-gold">Chapter {i + 1}</span>
                <span className="display text-2xl leading-none sm:text-4xl">{s.title}</span>
                <span className="mt-1.5 line-clamp-2 hidden text-xs text-bone/75 sm:block">{s.description}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 13. Tickets */}
      {event && !live && (
        <section className="container-acl pb-12 sm:pb-16">
          <div className="relative overflow-hidden bg-red px-5 py-8 sm:px-10 sm:py-12">
            <span aria-hidden className="display absolute -right-6 -top-10 text-[12rem] leading-none text-black/15 sm:text-[18rem]">ACL</span>
            <p className="relative text-xs font-bold uppercase tracking-[0.18em] text-white/85">Be in the building</p>
            <h2 className="relative mt-1 text-4xl text-white sm:text-6xl">{event.name}</h2>
            <p className="relative mt-2 text-white/90">{fmtEventDate(event.startsAt)} · {event.venue}, {event.city}{cheapest ? ` · from ${money(cheapest.priceMinor, cheapest.currency)}` : ""}</p>
            <div className="relative mt-5 flex flex-wrap gap-3">
              <Link href={`/events/${event.slug}/tickets`} className="btn btn-white btn-lg">Get tickets</Link>
              <Link href="/events" className="btn btn-lg bg-black/25 text-white hover:bg-black/40">All events</Link>
            </div>
          </div>
        </section>
      )}

      {/* 14. Merchandise */}
      <section className="container-acl pb-12 sm:pb-16">
        <SectionHeader eyebrow="ACL Shop" title="Wear the league" href="/shop" linkLabel="Shop all" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{products.map((p) => <ProductCard key={p.id} product={p} price={m.fmt(p.priceMinor, p.currency)} />)}</div>
      </section>

      {/* 15. Join ACL */}
      {!user && (
        <section className="border-y border-line bg-coal">
          <div className="container-acl grid gap-6 py-12 sm:py-16 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="eyebrow">ACL Passport</p>
              <h2 className="mt-1 text-4xl sm:text-6xl">Join the league</h2>
              <p className="mt-3 max-w-lg text-fog">Follow fighters, predict fights, earn fan points and climb from Rookie to Legend. Your ACL Passport records every event you attend and every fight you watch.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/join" className="btn btn-gold btn-lg">Join ACL — free</Link>
                <Link href="/apply" className="btn btn-ghost btn-lg">Become an ACL fighter</Link>
              </div>
            </div>
            <ul className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6 lg:grid-cols-3">
              {["Rookie", "Contender", "Challenger", "Elite", "Champion", "Legend"].map((r, i) => (
                <li key={r} className="border border-line px-2 py-4">
                  <span className="display block text-3xl text-gold">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em]">{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
