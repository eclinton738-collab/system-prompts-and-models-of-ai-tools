import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { ArticleCard } from "@/components/cards";
import { Breadcrumbs, EmptyState } from "@/components/ui";

type Props = { params: Promise<{ handle: string }> };
const load = (handle: string) => db.user.findFirst({ where: { handle, articles: { some: { status: "PUBLISHED" } } }, select: { name: true, bio: true, handle: true, articles: { where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, take: 30 } } });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await load((await params).handle);
  return a ? { title: `${a.name} — ACL Newsroom`, description: a.bio ?? `Stories by ${a.name}.`, alternates: { canonical: `/authors/${a.handle}` } } : { title: "Author" };
}

export default async function AuthorPage({ params }: Props) {
  const author = await load((await params).handle);
  if (!author) notFound();
  return (
    <div className="container-acl py-6 sm:py-10">
      <Breadcrumbs items={[{ href: "/news", label: "News" }, { label: author.name }]} />
      <p className="eyebrow">Author</p>
      <h1 className="text-4xl sm:text-6xl">{author.name}</h1>
      {author.bio && <p className="mt-3 max-w-2xl text-fog">{author.bio}</p>}
      <div className="mt-8">{author.articles.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{author.articles.map((a) => <ArticleCard key={a.id} article={a} />)}</div> : <EmptyState title="No stories yet" />}</div>
    </div>
  );
}
