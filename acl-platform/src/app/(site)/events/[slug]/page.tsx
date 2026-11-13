import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEvent } from "@/server/services/events";
import { getLiveSnapshot } from "@/server/services/live";
import { getMoney } from "@/server/services/money";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { ArticleCard, DateBlock, FightRow, ProductCard, VideoCard } from "@/components/cards";
import { FaceOff } from "@/components/fight";
import { Artwork } from "@/components/media";
import { LiveBoard } from "@/components/client/LiveBoard";
import { Countdown } from "@/components/client/Countdown";
import { ShareButtons } from "@/components/client/ShareButtons";
import { ToggleButton } from "@/components/client/ActionButton";
import { Breadcrumbs, EmptyState, Flag, JsonLd, LiveBadge } from "@/components/ui";
import { fmtDateShort, fmtEventDate, fmtTime, label } from "@/lib/format";
import { abs } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const e = await getEvent(slug);
  if (!e) return { title: "Event not found" };
  const description = `${e.name} — ${fmtEventDate(e.startsAt)} at ${e.venue}, ${e.city}, ${e.country.name}. Fight card, results, tickets and how to watch.`;
  return { title: e.name, description, alternates: { canonical: `/events/${slug}` }, openGraph: { title: e.name, description, images: [`/api/og/event/${slug}`] }, twitter: { card: "summary_large_image", title: e.name, description, images: [`/api/og/event/${slug}`] } };
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();
  const user = await getCurrentUser();
  const [m, live, fav] = await Promise.all([
    getMoney(),
    event.status === "LIVE" ? getLiveSnapshot(event.id) : null,
    user ? db.eventFavorite.findUnique({ where: { userId_eventId: { userId: user.id, eventId: event.id } } }) : null,
  ]);
  const fights = event.fights.filter((f) => f.status !== "CANCELLED");
  const main = fights.find((f) => f.position === "MAIN_EVENT");
  const co = fights.filter((f) => f.position === "CO_MAIN");
  const under = fights.filter((f) => f.position === "UNDERCARD");
  const isFightNight = event.type === "FIGHT_NIGHT";
  const done = event.status === "COMPLETED";
  const scheduled = event.status === "SCHEDULED";
  const onSale = scheduled && event.ticketTypes.some((t) => t.salesOpen);
  const cheapest = [...event.ticketTypes].sort((a, b) => a.priceMinor - b.priceMinor)[0];
  const by = (re: RegExp) => event.videos.filter((v) => re.test(v.category));
  const base = `/events/${event.slug}`;

  return (
    <article data-entity-type="event" data-entity-id={event.id}>
      <JsonLd
        data={{
          "@context": "https://schema.org", "@type": "SportsEvent", name: event.name, description: event.description, sport: "Boxing", startDate: event.startsAt.toISOString(), url: abs(base), image: abs(`/api/og/event/${event.slug}`),
          eventStatus: event.status === "CANCELLED" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          location: { "@type": "Place", name: event.venue, address: { "@type": "PostalAddress", addressLocality: event.city, addressRegion: event.state ?? undefined, addressCountry: event.countryCode } },
          organizer: { "@type": "SportsOrganization", name: "Africa Combat League", url: abs("/") },
          ...(onSale && cheapest ? { offers: { "@type": "Offer", url: abs(`${base}/tickets`), price: cheapest.priceMinor / 100, priceCurrency: cheapest.currency, availability: "https://schema.org/InStock" } } : {}),
        }}
      />
      <header className="relative overflow-hidden border-b border-line bg-coal">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(227,24,45,0.3),transparent_55%)]" />
        <div aria-hidden className="slash-bg absolute inset-0" />
        <div className="container-acl relative grid gap-6 py-6 sm:py-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <Breadcrumbs items={[{ href: "/events", label: "Events" }, ...(event.parentEvent ? [{ href: `/events/${event.parentEvent.slug}`, label: event.parentEvent.name }] : []), { label: event.name }]} />
            <div className="mb-3 flex flex-wrap gap-2">
              {event.status === "LIVE" ? <LiveBadge label="Live now" /> : done ? <span className="chip chip-gold">Final results</span> : event.status === "CANCELLED" ? <span className="chip chip-red">Cancelled</span> : <span className="chip chip-red">Upcoming</span>}
              <span className="chip">{label(event.type)}</span>
              {event.number && isFightNight && <span className="chip chip-outline">Event {event.number}</span>}
            </div>
            <h1 className="text-[clamp(2.6rem,9vw,6rem)] leading-[0.85]">{event.name}</h1>
            {event.tagline && <p className="display mt-2 text-2xl tracking-[0.12em] text-gold sm:text-3xl">{event.tagline}</p>}
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] sm:text-base">{fmtEventDate(event.startsAt)} · {fmtTime(event.startsAt)}</p>
            <p className="mt-1 text-fog"><Flag code={event.countryCode} name={event.country.name} /> {event.venue}, {event.city}{event.state && event.state !== event.city ? `, ${event.state}` : ""}, {event.country.name}</p>
            {scheduled && <div className="mt-5"><Countdown to={event.startsAt.toISOString()} initialMs={event.startsAt.getTime() - Date.now()} /></div>}
            <div className="mt-6 flex flex-wrap gap-3">
              {onSale && <Link href={`${base}/tickets`} className="btn btn-red btn-lg">Get tickets</Link>}
              {isFightNight && fights.length > 0 && <a href="#fight-card" className="btn btn-white btn-lg">{done ? "Results" : "Fight card"}</a>}
              {event.videos[0] && <Link href={`/watch/${event.videos[0].slug}`} className="btn btn-ghost btn-lg">▶ Watch</Link>}
              <ToggleButton endpoint="/api/v1/events/favorite" body={{ eventId: event.id }} initial={!!fav} onLabel="Saved ✓" offLabel="Save event" className="btn btn-lg" onClass="btn-gold" offClass="btn-ghost" />
            </div>
            {onSale && cheapest && <p className="mt-3 text-xs text-fog">Tickets from {m.fmt(cheapest.priceMinor, cheapest.currency)}</p>}
            <div className="mt-5"><ShareButtons path={base} title={`${event.name} — ${fmtEventDate(event.startsAt)}, ${event.city}`} image={`/api/og/event/${event.slug}`} /></div>
          </div>
          {main ? <FaceOff a={main.fighterA} b={main.fighterB} winnerId={main.status === "COMPLETED" ? main.winnerId : undefined} /> : <div className="hidden aspect-video lg:block"><Artwork alt="" seed={event.slug} label={event.name} kicker={label(event.type)} /></div>}
        </div>
      </header>

      <div className="container-acl grid gap-10 py-8 sm:py-12 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-12">
          {live && <LiveBoard eventId={event.id} initial={live} />}

          <section aria-labelledby="about-event">
            <h2 id="about-event" className="sr-only">About this event</h2>
            <p className="max-w-3xl text-lg leading-relaxed text-bone/85">{event.description}</p>
          </section>

          {isFightNight && (
            <section id="fight-card" aria-labelledby="fc-title" className="scroll-mt-20">
              <h2 id="fc-title" className="mb-5 text-3xl sm:text-5xl">{done ? "Results" : "Fight card"}</h2>
              {fights.length ? (
                <div className="space-y-8">
                  {main && <div><h3 className="eyebrow mb-2">Main event</h3><FightRow fight={main} showEvent={false} /></div>}
                  {co.length > 0 && <div><h3 className="eyebrow mb-2">Co-main event</h3><div className="space-y-3">{co.map((f) => <FightRow key={f.id} fight={f} showEvent={false} />)}</div></div>}
                  {under.length > 0 && <div><h3 className="eyebrow mb-2">Undercard</h3><div className="space-y-3">{under.map((f) => <FightRow key={f.id} fight={f} showEvent={false} />)}</div></div>}
                  <p className="text-xs text-fog">Card subject to change. Bout order is confirmed at the weigh-in.</p>
                </div>
              ) : (
                <EmptyState title="Fight card to be announced" body="Bouts are added here as contracts are signed." action={{ href: "/news", label: "Latest announcements" }} />
              )}
            </section>
          )}

          {event.programme.length > 0 && (
            <section aria-labelledby="week">
              <h2 id="week" className="mb-5 text-3xl sm:text-5xl">Fight week</h2>
              <ol className="space-y-3">
                {event.programme.map((p) => (
                  <li key={p.id}>
                    <Link href={`/events/${p.slug}`} className="card card-hover flex overflow-hidden">
                      <DateBlock date={p.startsAt} />
                      <div className="min-w-0 flex-1 p-3 sm:p-4">
                        <span className="chip mb-1.5">{label(p.type)}</span>
                        <p className="display text-xl leading-none sm:text-2xl">{p.name.split(": ").pop()}</p>
                        <p className="mt-1 truncate text-sm text-fog">{fmtTime(p.startsAt)} · {p.venue}, {p.city}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {([
            ["Face-offs & press", by(/FACE_OFFS|PRESS_CONFERENCES|WEIGH_INS/)],
            ["Highlights & full fights", by(/HIGHLIGHTS|FULL_FIGHTS/)],
            ["More from this event", by(/INTERVIEWS|TRAINING_CAMP|BEHIND_THE_SCENES|SHORT_CLIPS|DOCUMENTARY|LIVE/)],
          ] as const).filter(([, v]) => v.length).map(([title, vids]) => (
            <section key={title} aria-label={title}>
              <h2 className="mb-5 text-3xl sm:text-4xl">{title}</h2>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">{vids.map((v) => <VideoCard key={v.id} video={v} />)}</div>
            </section>
          ))}

          <section aria-labelledby="photos">
            <h2 id="photos" className="mb-5 text-3xl sm:text-4xl">Photos</h2>
            {event.photos.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{event.photos.map((p) => <figure key={p.id} className="aspect-square overflow-hidden border border-line"><Artwork src={p.url} alt={p.caption} /></figure>)}</div>
            ) : (
              <p className="card p-5 text-sm text-fog">{done ? "The official gallery for this event has not been published." : "Official photos are published after the weigh-in and on fight night."}</p>
            )}
          </section>

          {event.articles.length > 0 && (
            <section aria-labelledby="ev-news">
              <h2 id="ev-news" className="mb-5 text-3xl sm:text-4xl">News</h2>
              <div className="grid gap-4 sm:grid-cols-2">{event.articles.map((a) => <ArticleCard key={a.id} article={a} />)}</div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          {event.ticketTypes.length > 0 && scheduled && (
            <section className="card p-4" aria-labelledby="tix">
              <h2 id="tix" className="mb-3 text-2xl">Tickets</h2>
              <ul className="divide-y divide-line text-sm">
                {event.ticketTypes.map((t) => {
                  const left = t.capacity - t._count.tickets;
                  return (
                    <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span><span className="font-semibold">{t.name}</span><span className="block text-xs text-fog">{left <= 0 ? "Sold out" : left <= 20 ? `Only ${left} left` : t.section}</span></span>
                      <span className="text-right font-semibold">{m.fmt(t.priceMinor, t.currency)}</span>
                    </li>
                  );
                })}
              </ul>
              <Link href={`${base}/tickets`} className="btn btn-red mt-4 w-full">Get tickets</Link>
            </section>
          )}
          {event.ticketUrl && <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost w-full">Official ticket partner ↗</a>}
          <section className="card p-4" aria-labelledby="venue">
            <h2 id="venue" className="mb-2 text-2xl">Venue</h2>
            <p className="font-semibold">{event.venue}</p>
            <p className="text-sm text-fog">{event.city}{event.state && event.state !== event.city ? `, ${event.state}` : ""}, {event.country.name}</p>
            {event.venueInfo && <p className="mt-3 text-sm text-bone/80">{event.venueInfo}</p>}
            <p className="mt-3 text-xs text-fog">First bell {fmtTime(event.startsAt)} · {fmtDateShort(event.startsAt)}</p>
          </section>
          {event.broadcast && (
            <section className="card p-4" aria-labelledby="how">
              <h2 id="how" className="mb-2 text-2xl">How to watch</h2>
              <p className="text-sm text-bone/85">{event.broadcast}</p>
              <Link href="/watch" className="btn btn-ghost btn-sm mt-3">Open ACL Watch</Link>
            </section>
          )}
          {event.rivalries.map((r) => (
            <Link key={r.id} href={`/rivalries/${r.slug}`} className="card card-hover block p-4">
              <p className="eyebrow">{r.type === "REGION" ? "State war" : "Rivalry"}</p>
              <p className="display text-2xl">{r.sideA} <span className="text-red">vs</span> {r.sideB}</p>
              <p className="mt-1 text-sm text-fog">{r.tagline}</p>
            </Link>
          ))}
          {event.products.length > 0 && (
            <section aria-labelledby="ev-merch">
              <h2 id="ev-merch" className="mb-3 text-2xl">Event merchandise</h2>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">{event.products.map((p) => <ProductCard key={p.id} product={p} price={m.fmt(p.priceMinor, p.currency)} />)}</div>
            </section>
          )}
          {event.sponsors.length > 0 && (
            <section className="card p-4" aria-labelledby="sponsors">
              <h2 id="sponsors" className="mb-3 text-2xl">Partners</h2>
              <ul className="space-y-2 text-sm">
                {event.sponsors.map((s) => <li key={s.id} className="flex items-center justify-between gap-2"><span className="font-semibold">{s.name}</span><span className="chip chip-outline">{label(s.tier)}</span></li>)}
              </ul>
              <Link href="/partners" className="mt-3 inline-block text-xs font-semibold uppercase tracking-widest text-gold">Sponsor an ACL event →</Link>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}
