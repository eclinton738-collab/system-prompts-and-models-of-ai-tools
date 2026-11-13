import { route, pageParams } from "@/server/api";
import { db } from "@/server/db";

export const GET = route({}, async ({ req }) => {
  const { take, skip } = pageParams(req);
  const category = req.nextUrl.searchParams.get("category")?.toUpperCase().replace(/-/g, "_");
  // sourceUrl is deliberately omitted: premium streams are only resolved on the watch page after an entitlement check.
  return db.video.findMany({ where: { status: "PUBLISHED", ...(category && { category: category as "HIGHLIGHTS" }) }, orderBy: { publishedAt: "desc" }, take, skip, select: { slug: true, title: true, description: true, category: true, durationSec: true, thumbnailUrl: true, premium: true, publishedAt: true, views: true, fighters: { select: { slug: true, firstName: true, lastName: true } }, event: { select: { slug: true, name: true } } } });
});
