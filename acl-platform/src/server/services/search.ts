import "server-only";
import { db } from "../db";
import { fighterInclude, withRecords } from "./fighters";
import { fightInclude, hydrateFights } from "./fights";

/**
 * Global search across every public entity. Postgres ILIKE today; the function
 * signature is the seam for a dedicated index (Meilisearch/Typesense/pgvector) later.
 */
export async function globalSearch(query: string, take = 6) {
  const q = query.trim().slice(0, 80);
  if (q.length < 2) return null;
  const c = { contains: q, mode: "insensitive" as const };
  const words = q.split(/\s+/).filter((w) => w.length > 1);
  const nameMatch = words.map((w) => ({ OR: [{ firstName: { contains: w, mode: "insensitive" as const } }, { lastName: { contains: w, mode: "insensitive" as const } }, { nickname: { contains: w, mode: "insensitive" as const } }] }));
  const [fighters, events, fights, articles, videos, gyms, divisions] = await Promise.all([
    db.fighter.findMany({ where: { OR: [{ AND: nameMatch }, { style: c }, { country: { name: c } }] }, include: fighterInclude, take }),
    db.event.findMany({ where: { OR: [{ name: c }, { city: c }, { venue: c }, { tagline: c }] }, include: { country: true }, orderBy: { startsAt: "desc" }, take }),
    db.fight.findMany({
      where: { OR: [{ fighterA: { AND: nameMatch } }, { fighterB: { AND: nameMatch } }, { event: { name: c } }] },
      include: fightInclude,
      orderBy: { event: { startsAt: "desc" } },
      take,
    }),
    db.article.findMany({ where: { status: "PUBLISHED", OR: [{ title: c }, { excerpt: c }, { tags: { some: { name: c } } }] }, orderBy: { publishedAt: "desc" }, take }),
    db.video.findMany({ where: { status: "PUBLISHED", OR: [{ title: c }, { description: c }] }, orderBy: { publishedAt: "desc" }, take }),
    db.gym.findMany({ where: { OR: [{ name: c }, { city: c }, { state: c }] }, include: { country: true }, take }),
    db.division.findMany({ where: { name: c, active: true }, take }),
  ]);
  const fighterCards = await withRecords(fighters);
  const fightCards = await hydrateFights(fights);
  const champions = fighterCards.filter((f) => f.isChampion);
  const total = fighters.length + events.length + fights.length + articles.length + videos.length + gyms.length + divisions.length;
  return { q, total, fighters: fighterCards, champions, events, fights: fightCards, articles, videos, gyms, divisions };
}

export type SearchResults = NonNullable<Awaited<ReturnType<typeof globalSearch>>>;
