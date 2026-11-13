import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { getFighterCards } from "@/server/services/fighters";
import { ArticleCard, FighterCardView, VideoCard } from "@/components/cards";
import { Artwork } from "@/components/media";
import { ShareButtons } from "@/components/client/ShareButtons";
import { EngagePing } from "@/components/client/Beacon";
import { Breadcrumbs, JsonLd } from "@/components/ui";
import { fmtDate, fmtTime, label } from "@/lib/format";
import { toParam } from "@/lib/content";
import { abs, SITE } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

const load = (slug: string) =>
  db.article.findFirst({ where: { slug, status: "PUBLISHED" }, include: { author: { select: { name: true, handle: true, bio: true } }, tags: true, fighters: { select: { id: true } }, event: { select: { slug: true, name: true, status: true } } } });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await load((await params).slug);
  if (!a) return { title: "Story not found" };
  return { title: a.title, description: a.excerpt, alternates: { canonical: `/news/${a.slug}` }, openGraph: { type: "article", title: a.title, description: a.excerpt, publishedTime: a.publishedAt.toISOString(), authors: [a.author.name], images: [`/api/og/article/${a.slug}`] }, twitter: { card: "summary_large_image", title: a.title, description: a.excerpt, images: [`/api/og/article/${a.slug}`] } };
}

export default async function ArticlePage({ params }: Props) {
  const a = await load((await params).slug);
  if (!a) notFound();
  const fighterIds = a.fighters.map((f) => f.id);
  const [related, fighters, videos] = await Promise.all([
    db.article.findMany({ where: { status: "PUBLISHED", id: { not: a.id }, OR: [{ category: a.category }, { tags: { some: { id: { in: a.tags.map((t) => t.id) } } } }, { fighters: { some: { id: { in: fighterIds } } } }] }, orderBy: { publishedAt: "desc" }, take: 3 }),
    fighterIds.length ? getFighterCards({ id: { in: fighterIds } }) : [],
    fighterIds.length ? db.video.findMany({ where: { status: "PUBLISHED", fighters: { some: { id: { in: fighterIds } } } }, orderBy: { publishedAt: "desc" }, take: 2 }) : [],
    db.article.update({ where: { id: a.id }, data: { views: { increment: 1 } } }).catch(() => null),
  ]);
  return (
    <article data-entity-type="article" data-entity-id={a.id}>
      <EngagePing kind="read" id={a.id} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "NewsArticle", headline: a.title, description: a.excerpt, datePublished: a.publishedAt.toISOString(), author: { "@type": "Person", name: a.author.name, url: abs(`/authors/${a.author.handle}`) }, publisher: { "@type": "Organization", name: SITE.name }, mainEntityOfPage: abs(`/news/${a.slug}`), image: abs(`/api/og/article/${a.slug}`) }} />
      <div className="container-acl grid gap-10 py-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <Breadcrumbs items={[{ href: "/news", label: "News" }, { href: `/news/category/${toParam(a.category)}`, label: label(a.category) }]} />
          <h1 className="max-w-4xl text-4xl sm:text-6xl">{a.title}</h1>
          <p className="mt-4 max-w-3xl text-lg text-fog sm:text-xl">{a.excerpt}</p>
          <p className="mt-4 text-sm text-fog">By <Link href={`/authors/${a.author.handle}`} className="font-semibold text-bone hover:text-gold">{a.author.name}</Link> · <time dateTime={a.publishedAt.toISOString()}>{fmtDate(a.publishedAt)}, {fmtTime(a.publishedAt)}</time></p>
          <div className="my-6 aspect-[16/9] max-w-4xl overflow-hidden border border-line"><Artwork src={a.coverUrl} alt="" seed={a.slug} tone={a.category === "BREAKING_NEWS" ? "red" : "steel"} kicker={label(a.category)} label={a.title} /></div>
          <div className="prose-acl max-w-3xl">{a.body.split(/\n\n+/).map((p, i) => <p key={i}>{p}</p>)}</div>
          {a.tags.length > 0 && <ul className="mt-6 flex flex-wrap gap-2">{a.tags.map((t) => <li key={t.id}><Link href={`/news?tag=${t.slug}`} className="chip chip-outline min-h-8 px-2.5 hover:text-bone">{t.name}</Link></li>)}</ul>}
          <div className="mt-6 border-y border-line py-4"><ShareButtons path={`/news/${a.slug}`} title={a.title} image={`/api/og/article/${a.slug}`} /></div>
          {a.event && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 bg-red p-4 text-white">
              <p className="display text-2xl">{a.event.name}</p>
              <div className="flex gap-2">
                <Link href={`/events/${a.event.slug}`} className="btn btn-white btn-sm">Event page</Link>
                {a.event.status === "SCHEDULED" && <Link href={`/events/${a.event.slug}/tickets`} className="btn btn-sm bg-black/30 text-white">Get tickets</Link>}
              </div>
            </div>
          )}
        </div>
        <aside className="space-y-8">
          {fighters.length > 0 && (
            <section aria-labelledby="in-story">
              <h2 id="in-story" className="mb-3 text-2xl">In this story</h2>
              <div className="grid grid-cols-2 gap-3">{fighters.map((f) => <FighterCardView key={f.id} fighter={f} />)}</div>
            </section>
          )}
          {videos.length > 0 && (
            <section aria-labelledby="rel-watch">
              <h2 id="rel-watch" className="mb-3 text-2xl">Watch</h2>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">{videos.map((v) => <VideoCard key={v.id} video={v} />)}</div>
            </section>
          )}
        </aside>
      </div>
      {related.length > 0 && (
        <section aria-labelledby="related" className="container-acl pb-10">
          <h2 id="related" className="mb-5 text-3xl sm:text-4xl">Related stories</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{related.map((r) => <ArticleCard key={r.id} article={r} />)}</div>
        </section>
      )}
    </article>
  );
}
