import { route } from "@/server/api";
import { db } from "@/server/db";

export const GET = route({}, async ({ req }) => {
  const sp = req.nextUrl.searchParams;
  return db.gym.findMany({ where: { ...(sp.get("country") && { countryCode: sp.get("country")!.toUpperCase() }), ...(sp.get("city") && { city: sp.get("city")! }), ...(sp.get("discipline") && { disciplines: { has: sp.get("discipline")! } }) }, orderBy: { name: "asc" }, select: { slug: true, name: true, countryCode: true, state: true, city: true, disciplines: true, aclAffiliated: true, programs: true } });
});
