import { route } from "@/server/api";
import { getDivisionRankings, getDivisions, getCountryRankings } from "@/server/services/rankings";
import { publicFighter } from "@/server/serializers";

export const GET = route({}, async ({ req }) => {
  if (req.nextUrl.searchParams.get("scope") === "countries") return (await getCountryRankings()).map((r, i) => ({ position: i + 1, country: { code: r.country.code, name: r.country.name }, score: r.score, champions: r.champions, ranked: r.ranked, aclWins: r.aclWins, fighters: r.fighters, gyms: r.gyms }));
  const divisions = await getDivisions();
  const want = req.nextUrl.searchParams.get("division");
  const out = [];
  for (const d of divisions.filter((x) => !want || x.slug === want)) {
    const r = (await getDivisionRankings(d.slug))!;
    out.push({ division: { slug: d.slug, name: d.name, limitLbs: d.limitLbs }, champion: r.champion ? publicFighter(r.champion) : null, contenders: r.contenders.map((c) => ({ rank: c.rank, previousRank: c.previousRank, fighter: publicFighter(c.fighter), nextFight: c.fighter.nextFight?.slug ?? null })) });
  }
  return out;
});
