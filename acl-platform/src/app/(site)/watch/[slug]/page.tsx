import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { VideoCard } from "@/components/cards";
import { Artwork, FighterPortrait } from "@/components/media";
import { ShareButtons } from "@/components/client/ShareButtons";
import { ToggleButton } from "@/components/client/ActionButton";
import { EngagePing } from "@/components/client/Beacon";
import { Breadcrumbs, JsonLd } from "@/components/ui";
import { compact, duration, fmtDate, label } from "@/lib/format";
import { toParam } from "@/lib/content";
import { abs } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };
const load = (slug: string) =>
  db.video.findFirst({ where: { slug, status: "PUBLISHED" }, include: { fighters: { select: { id: true, slug: true, firstName: true, lastName: true, photoUrl: true } }, event: { select: { slug: true, name: true, status: true } }, fight: { select: { slug: true } }, series: true } });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const v = await load((await params).slug);
  if (!v) return { title: "Video not found" };
  return { title: `${v.title} — ACL Watch`, description: v.description, alternates: { canonical: `/watch/${v.slug}` }, openGraph: { type: "video.other", title: v.title, description: v.description, images: [`/api/og/video/${v.slug}`] }, twitter: { card: "summary_large_image", title: v.title, description: v.description, images: [`/api/og/video/${v.slug}`] } };
}

export default async function VideoPage({ params }: Props) {
  const v = await load((await params).slug);
  if (!v) notFound();
  const user = await getCurrentUser();
  const fighterIds = v.fighters.map((f) => f.id);
  const [related, saved] = await Promise.all([
    db.video.findMany({ where: { status: "PUBLISHED", id: { not: v.id }, OR: [{ fighters: { some: { id: { in: fighterIds } } } }, ...(v.eventId ? [{ eventId: v.eventId }] : []), { category: v.category }, ...(v.seriesId ? [{ seriesId: { not: null } }] : [])] }, orderBy: { publishedAt: "desc" }, take: 8 }),
    user ? db.watchlistItem.findUnique({ where: { userId_videoId: { userId: user.id, videoId: v.id } } }) : null,
  ]);
  const locked = v.premium && !user?.premium;
  return (
    <article data-entity-type="video" data-entity-id={v.id}>
      {!locked && <EngagePing kind="watch" id={v.id} delayMs={5000} />}
      <JsonLd data={{ "@context": "https://schema.org", "@type": "VideoObject", name: v.title, description: v.description, uploadDate: v.publishedAt.toISOString(), duration: `PT${Math.floor(v.durationSec / 60)}M${v.durationSec % 60}S`, thumbnailUrl: abs(`/api/og/video/${v.slug}`), ...(v.sourceUrl && !v.premium ? { contentUrl: v.sourceUrl } : {}), embedUrl: abs(`/watch/${v.slug}`) }} />
      <div className="border-b border-line bg-black">
        <div className="mx-auto max-w-6xl">
          <div className="relative aspect-video">
            {locked ? (
              <>
                <Artwork src={v.thumbnailUrl} alt="" seed={v.slug} tone="gold" />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 p-6 text-center">
                  <span className="chip chip-gold mb-3">Premium</span>
                  <p className="display text-3xl sm:text-5xl">Members only</p>
                  <p className="mt-2 max-w-md text-sm text-fog">Full fights and ACL Originals are part of ACL Premium. Subscriptions open soon — join free now and you will be first to know.</p>
                  <Link href={user ? "/account" : `/join?next=/watch/${v.slug}`} className="btn btn-gold mt-4">{user ? "View membership" : "Join ACL"}</Link>
                </div>
              </>
            ) : v.sourceUrl ? (
              <video controls preload="metadata" playsInline poster={v.thumbnailUrl ?? undefined} className="h-full w-full bg-black">
                <source src={v.sourceUrl} />
                Your browser cannot play this video.
              </video>
            ) : (
              <>
                <Artwork src={v.thumbnailUrl} alt="" seed={v.slug} tone={v.category === "DOCUMENTARY" ? "gold" : "red"} />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 p-6 text-center">
                  <p className="display text-2xl sm:text-4xl">Video source not attached</p>
                  <p className="mt-2 max-w-md text-sm text-fog">This is a demo catalogue entry. Attach an HLS or MP4 URL to this video in the admin CMS and the player appears here.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="container-acl grid gap-10 py-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <Breadcrumbs items={[{ href: "/watch", label: "Watch" }, { href: `/watch/category/${toParam(v.category)}`, label: label(v.category) }]} />
          <h1 className="text-3xl sm:text-5xl">{v.title}</h1>
          <p className="mt-2 text-sm text-fog">{duration(v.durationSec)} · {compact(v.views)} views · {fmtDate(v.publishedAt)}{v.series ? ` · ${v.series.title}${v.episode ? `, episode ${v.episode}` : ""}` : ""}</p>
          <p className="mt-4 max-w-3xl text-bone/85">{v.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <ToggleButton endpoint="/api/v1/watchlist" body={{ videoId: v.id }} initial={!!saved} onLabel="In watchlist ✓" offLabel="+ Watchlist" className="btn btn-sm" onClass="btn-gold" offClass="btn-ghost" />
            {v.fight && <Link href={`/fights/${v.fight.slug}`} className="btn btn-ghost btn-sm">Fight page</Link>}
            {v.event && <Link href={`/events/${v.event.slug}`} className="btn btn-ghost btn-sm">{v.event.name}</Link>}
            {v.event?.status === "SCHEDULED" && <Link href={`/events/${v.event.slug}/tickets`} className="btn btn-red btn-sm">Get tickets</Link>}
          </div>
          <div className="mt-5"><ShareButtons path={`/watch/${v.slug}`} title={v.title} image={`/api/og/video/${v.slug}`} /></div>
          {v.fighters.length > 0 && (
            <section aria-labelledby="featuring" className="mt-8">
              <h2 id="featuring" className="mb-3 text-2xl">Featuring</h2>
              <ul className="flex flex-wrap gap-3">
                {v.fighters.map((f) => (
                  <li key={f.id}><Link href={`/fighters/${f.slug}`} className="card card-hover flex items-center gap-3 py-1.5 pl-1.5 pr-4"><span className="h-11 w-11 overflow-hidden rounded-sm bg-steel"><FighterPortrait fighter={f} /></span><span className="text-sm font-semibold">{f.firstName} {f.lastName}<span className="block text-xs font-normal text-gold">Follow →</span></span></Link></li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <aside aria-labelledby="up-next">
          <h2 id="up-next" className="mb-3 text-2xl">Related videos</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">{related.map((r) => <VideoCard key={r.id} video={r} />)}</div>
        </aside>
      </div>
    </article>
  );
}
