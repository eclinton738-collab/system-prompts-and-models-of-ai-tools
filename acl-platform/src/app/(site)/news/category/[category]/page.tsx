import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { ArticleCard } from "@/components/cards";
import { Breadcrumbs, EmptyState } from "@/components/ui";
import { ARTICLE_CATEGORIES, fromParam } from "@/lib/content";
import { label } from "@/lib/format";

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = fromParam(ARTICLE_CATEGORIES, (await params).category);
  return c ? { title: `${label(c)} — News`, description: `${label(c)} from the ACL Newsroom.`, alternates: { canonical: `/news/category/${(await params).category}` } } : { title: "News" };
}

export default async function NewsCategoryPage({ params }: Props) {
  const category = fromParam(ARTICLE_CATEGORIES, (await params).category);
  if (!category) notFound();
  const articles = await db.article.findMany({ where: { status: "PUBLISHED", category }, orderBy: { publishedAt: "desc" }, take: 30 });
  return (
    <div className="container-acl py-6 sm:py-10">
      <Breadcrumbs items={[{ href: "/news", label: "News" }, { label: label(category) }]} />
      <h1 className="mb-8 text-4xl sm:text-6xl">{label(category)}</h1>
      {articles.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{articles.map((a) => <ArticleCard key={a.id} article={a} />)}</div> : <EmptyState title="Nothing published in this category yet" action={{ href: "/news", label: "All news" }} />}
    </div>
  );
}
