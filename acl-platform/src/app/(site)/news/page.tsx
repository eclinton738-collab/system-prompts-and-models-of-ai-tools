import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { ArticleCard } from "@/components/cards";
import { EmptyState, PageHeader } from "@/components/ui";
import { label, timeAgo } from "@/lib/format";
import { ARTICLE_CATEGORIES } from "@/lib/content";

export const metadata: Metadata = { title: "News", description: "ACL Newsroom: breaking news, fight announcements, interviews, rankings updates and stories from across African combat sports.", alternates: { canonical: "/news" } };

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ q?: string; tag?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80);
  const page = Math.max(1, Number(sp.page) || 1);
  const PER = 9;
  const where = {
    status: "PUBLISHED" as const,
    ...(q && { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { excerpt: { contains: q, mode: "insensitive" as const } }, { body: { contains: q, mode: "insensitive" as const } }] }),
    ...(sp.tag && { tags: { some: { slug: sp.tag } } }),
  };
  const filtered = !!(q || sp.tag);
  const [featured, articles, total, trending, tags] = await Promise.all([
    filtered || page > 1 ? [] : db.article.findMany({ where: { status: "PUBLISHED", featured: true }, orderBy: { publishedAt: "desc" }, take: 3 }),
    db.article.findMany({ where, orderBy: { publishedAt: "desc" }, skip: (page - 1) * PER, take: PER }),
    db.article.count({ where }),
    db.article.findMany({ where: { status: "PUBLISHED" }, orderBy: { views: "desc" }, take: 5, select: { slug: true, title: true, publishedAt: true } }),
    db.tag.findMany({ where: { articles: { some: {} } }, orderBy: { name: "asc" } }),
  ]);
  const pages = Math.ceil(total / PER);
  const qs = (p: number) => `/news?${new URLSearchParams({ ...(q && { q }), ...(sp.tag && { tag: sp.tag }), ...(p > 1 && { page: String(p) }) })}`;
  return (
    <>
      <PageHeader eyebrow="ACL Newsroom" title="News">
        <form action="/news" role="search" className="mt-5 flex max-w-xl gap-2">
          <label htmlFor="news-q" className="sr-only">Search news</label>
          <input id="news-q" name="q" type="search" defaultValue={q} placeholder="Search stories" className="field" />
          <button className="btn btn-red" type="submit">Search</button>
        </form>
      </PageHeader>
      <div className="container-acl py-6 sm:py-10">
        <nav aria-label="News categories" className="-mx-4 mb-8 overflow-x-auto px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: "none" }}>
          <ul className="flex min-w-max gap-2">
            <li><Link href="/news" aria-current={!filtered ? "page" : undefined} className="chip chip-red min-h-9 px-3">All</Link></li>
            {ARTICLE_CATEGORIES.map((c) => <li key={c}><Link href={`/news/category/${c.toLowerCase().replace(/_/g, "-")}`} className="chip chip-outline min-h-9 px-3 hover:text-bone">{label(c)}</Link></li>)}
          </ul>
        </nav>

        {featured.length > 0 && (
          <section aria-label="Featured" className="mb-12 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2"><ArticleCard article={featured[0]} large /></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">{featured.slice(1).map((a) => <ArticleCard key={a.id} article={a} />)}</div>
          </section>
        )}

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section aria-labelledby="latest">
            <h2 id="latest" className="mb-5 text-3xl sm:text-4xl">{q ? `Results for “${q}”` : sp.tag ? `Tagged: ${tags.find((t) => t.slug === sp.tag)?.name ?? sp.tag}` : "Latest"}</h2>
            {articles.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{articles.map((a) => <ArticleCard key={a.id} article={a} />)}</div>
            ) : (
              <EmptyState title="No stories found" body="Try a different search term." action={{ href: "/news", label: "All news" }} />
            )}
            {pages > 1 && (
              <nav aria-label="Pagination" className="mt-8 flex items-center justify-between">
                {page > 1 ? <Link href={qs(page - 1)} className="btn btn-ghost btn-sm">← Newer</Link> : <span />}
                <span className="text-sm text-fog">Page {page} of {pages}</span>
                {page < pages ? <Link href={qs(page + 1)} className="btn btn-ghost btn-sm">Older →</Link> : <span />}
              </nav>
            )}
          </section>
          <aside className="space-y-8">
            <section aria-labelledby="trending">
              <h2 id="trending" className="mb-3 text-2xl">Trending</h2>
              <ol className="divide-y divide-line border-y border-line">
                {trending.map((t, i) => (
                  <li key={t.slug}><Link href={`/news/${t.slug}`} className="flex gap-3 py-3 hover:text-gold"><span className="display text-3xl text-red">{i + 1}</span><span><span className="block text-sm font-semibold leading-snug">{t.title}</span><span className="text-xs text-fog">{timeAgo(t.publishedAt)}</span></span></Link></li>
                ))}
              </ol>
            </section>
            <section aria-labelledby="tags">
              <h2 id="tags" className="mb-3 text-2xl">Tags</h2>
              <ul className="flex flex-wrap gap-2">{tags.map((t) => <li key={t.id}><Link href={`/news?tag=${t.slug}`} className={`chip min-h-8 px-2.5 ${sp.tag === t.slug ? "chip-gold" : "chip-outline hover:text-bone"}`}>{t.name}</Link></li>)}</ul>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
