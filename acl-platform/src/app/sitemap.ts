import type { MetadataRoute } from "next";
import { db } from "@/server/db";
import { abs } from "@/lib/site";
import { ARTICLE_CATEGORIES, VIDEO_CATEGORIES, toParam } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [fighters, events, fights, articles, videos, gyms, divisions, rivalries, products, countries] = await Promise.all([
    db.fighter.findMany({ select: { slug: true, updatedAt: true } }),
    db.event.findMany({ select: { slug: true, updatedAt: true } }),
    db.fight.findMany({ where: { status: { not: "CANCELLED" } }, select: { slug: true, updatedAt: true } }),
    db.article.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, publishedAt: true } }),
    db.video.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, publishedAt: true } }),
    db.gym.findMany({ select: { slug: true } }),
    db.division.findMany({ where: { active: true }, select: { slug: true } }),
    db.rivalry.findMany({ select: { slug: true } }),
    db.product.findMany({ where: { active: true }, select: { slug: true } }),
    db.country.findMany({ where: { OR: [{ fighters: { some: {} } }, { gyms: { some: {} } }] }, select: { code: true } }),
  ]);
  const u = (path: string, lastModified?: Date, priority = 0.6, changeFrequency: "hourly" | "daily" | "weekly" | "monthly" = "weekly") => ({ url: abs(path), lastModified, priority, changeFrequency });
  return [
    u("/", new Date(), 1, "hourly"),
    ...["/fights", "/fighters", "/rankings", "/champions", "/events", "/news", "/watch"].map((p) => u(p, undefined, 0.9, "daily")),
    ...["/rankings/countries", "/rivalries", "/state-wars", "/originals", "/map", "/gyms", "/shop", "/tickets", "/community", "/predictions", "/leaderboard", "/apply", "/partners", "/media", "/about", "/contact", "/careers", "/join", "/privacy", "/terms", "/cookies"].map((p) => u(p, undefined, 0.5)),
    ...fighters.map((f) => u(`/fighters/${f.slug}`, f.updatedAt, 0.8)),
    ...events.map((e) => u(`/events/${e.slug}`, e.updatedAt, 0.8, "daily")),
    ...fights.map((f) => u(`/fights/${f.slug}`, f.updatedAt, 0.7)),
    ...articles.map((a) => u(`/news/${a.slug}`, a.publishedAt, 0.7, "monthly")),
    ...videos.map((v) => u(`/watch/${v.slug}`, v.publishedAt, 0.6, "monthly")),
    ...gyms.map((g) => u(`/gyms/${g.slug}`)),
    ...divisions.map((d) => u(`/champions/${d.slug}`, undefined, 0.7)),
    ...rivalries.map((r) => u(`/rivalries/${r.slug}`, undefined, 0.7)),
    ...products.map((p) => u(`/shop/${p.slug}`)),
    ...countries.map((c) => u(`/map/${c.code.toLowerCase()}`)),
    ...ARTICLE_CATEGORIES.map((c) => u(`/news/category/${toParam(c)}`, undefined, 0.4)),
    ...VIDEO_CATEGORIES.map((c) => u(`/watch/category/${toParam(c)}`, undefined, 0.4)),
  ];
}
