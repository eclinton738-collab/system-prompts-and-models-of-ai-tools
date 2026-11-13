import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { VideoCard } from "@/components/cards";
import { Breadcrumbs, EmptyState } from "@/components/ui";
import { VIDEO_CATEGORIES, fromParam } from "@/lib/content";
import { label } from "@/lib/format";

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = (await params).category;
  const c = fromParam(VIDEO_CATEGORIES, p);
  return c ? { title: `${label(c)} — ACL Watch`, description: `Watch ACL ${label(c).toLowerCase()}.`, alternates: { canonical: `/watch/category/${p}` } } : { title: "ACL Watch" };
}

export default async function WatchCategoryPage({ params }: Props) {
  const category = fromParam(VIDEO_CATEGORIES, (await params).category);
  if (!category) notFound();
  const videos = await db.video.findMany({ where: { status: "PUBLISHED", category }, orderBy: { publishedAt: "desc" }, take: 48 });
  return (
    <div className="container-acl py-6 sm:py-10">
      <Breadcrumbs items={[{ href: "/watch", label: "Watch" }, { label: label(category) }]} />
      <h1 className="mb-8 text-4xl sm:text-6xl">{label(category)}</h1>
      {videos.length ? <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{videos.map((v) => <VideoCard key={v.id} video={v} />)}</div> : <EmptyState title={category === "LIVE" ? "Nothing is live right now" : "No videos in this category yet"} action={{ href: "/watch", label: "Back to Watch" }} />}
    </div>
  );
}
