import { route, pageParams } from "@/server/api";
import { db } from "@/server/db";

export const GET = route({}, async ({ req }) => {
  const { take, skip } = pageParams(req);
  const category = req.nextUrl.searchParams.get("category")?.toUpperCase().replace(/-/g, "_");
  return db.article.findMany({ where: { status: "PUBLISHED", ...(category && { category: category as "RANKINGS" }) }, orderBy: { publishedAt: "desc" }, take, skip, select: { slug: true, title: true, excerpt: true, category: true, publishedAt: true, coverUrl: true, author: { select: { name: true, handle: true } }, tags: { select: { slug: true, name: true } } } });
});
