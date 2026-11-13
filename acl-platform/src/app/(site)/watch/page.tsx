import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { VideoCard } from "@/components/cards";
import { Artwork } from "@/components/media";
import { EmptyState, LiveBadge } from "@/components/ui";
import { VIDEO_CATEGORIES, toParam } from "@/lib/content";
import { duration, label } from "@/lib/format";

export const metadata: Metadata = { title: "ACL Watch", description: "Watch ACL: live events, full fights, highlights, interviews, press conferences, face-offs, weigh-ins, training camp and documentaries.", alternates: { canonical: "/watch" } };

export default async function WatchPage() {
  const user = await getCurrentUser();
  const [videos, liveEvent, watchlist, history] = await Promise.all([
    db.video.findMany({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" } }),
    db.event.findFirst({ where: { status: "LIVE" }, select: { slug: true, name: true } }),
    user ? db.watchlistItem.findMany({ where: { userId: user.id }, include: { video: true }, orderBy: { createdAt: "desc" }, take: 10 }) : [],
    user ? db.videoView.findMany({ where: { userId: user.id }, select: { video: { select: { fighters: { select: { id: true } } } } }, take: 30 }) : [],
  ]);
  const hero = videos[0];
  // Lightweight personalisation: more from fighters in your viewing history.
  const seen = new Set(history.flatMap((h) => h.video.fighters.map((f) => f.id)));
  const forYou = seen.size ? await db.video.findMany({ where: { status: "PUBLISHED", fighters: { some: { id: { in: [...seen] } } }, viewsBy: { none: { userId: user!.id } } }, orderBy: { publishedAt: "desc" }, take: 10 }) : [];
  const rows = VIDEO_CATEGORIES.map((c) => [c, videos.filter((v) => v.category === c)] as const).filter(([, v]) => v.length);
  if (!hero) return <div className="container-acl py-16"><EmptyState title="ACL Watch is warming up" body="Videos will appear here soon." /></div>;
  return (
    <>
      <section className="relative border-b border-line">
        <div className="absolute inset-0"><Artwork src={hero.thumbnailUrl} alt="" seed={hero.slug} tone="red" /></div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/20" />
        <div className="container-acl relative flex min-h-[52vh] flex-col justify-end py-8 sm:min-h-[60vh] sm:py-12">
          <p className="eyebrow">ACL Watch · {label(hero.category)}</p>
          <h1 className="mt-1 max-w-4xl text-4xl sm:text-7xl">{hero.title}</h1>
          <p className="mt-3 max-w-2xl text-bone/85">{hero.description}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href={`/watch/${hero.slug}`} className="btn btn-red btn-lg">▶ Play · {duration(hero.durationSec)}</Link>
            <Link href="/originals" className="btn btn-ghost btn-lg">ACL Originals</Link>
          </div>
        </div>
      </section>
      <div className="container-acl space-y-10 py-8 sm:py-12">
        <section aria-labelledby="row-live">
          <h2 id="row-live" className="mb-3 flex items-center gap-3 text-2xl sm:text-3xl">Live {liveEvent && <LiveBadge />}</h2>
          {liveEvent ? (
            <Link href={`/events/${liveEvent.slug}`} className="card card-hover flex items-center justify-between gap-4 border-red/60 p-4"><span className="display text-2xl">{liveEvent.name}</span><span className="btn btn-red btn-sm">Follow live</span></Link>
          ) : (
            <p className="card p-4 text-sm text-fog">Nothing is live right now. Fight nights, weigh-ins and press conferences stream here. <Link href="/events" className="text-gold underline">See the schedule</Link>.</p>
          )}
        </section>
        {watchlist.length > 0 && (
          <section aria-labelledby="row-wl"><h2 id="row-wl" className="mb-3 text-2xl sm:text-3xl">Your watchlist</h2><div className="rail">{watchlist.map((w) => <VideoCard key={w.videoId} video={w.video} wide />)}</div></section>
        )}
        {forYou.length > 0 && (
          <section aria-labelledby="row-fy"><h2 id="row-fy" className="mb-3 text-2xl sm:text-3xl">Because of what you watched</h2><div className="rail">{forYou.map((v) => <VideoCard key={v.id} video={v} wide />)}</div></section>
        )}
        {rows.map(([c, list]) => (
          <section key={c} aria-labelledby={`row-${c}`}>
            <div className="mb-3 flex items-end justify-between">
              <h2 id={`row-${c}`} className="text-2xl sm:text-3xl">{label(c)}</h2>
              <Link href={`/watch/category/${toParam(c)}`} className="text-xs font-semibold uppercase tracking-widest text-fog hover:text-gold">See all →</Link>
            </div>
            <div className="rail">{list.slice(0, 10).map((v) => <VideoCard key={v.id} video={v} wide />)}</div>
          </section>
        ))}
      </div>
    </>
  );
}
