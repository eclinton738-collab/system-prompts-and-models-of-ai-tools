import "server-only";
import { db } from "../db";
import { fighterInclude, withRecords, type FighterCard } from "./fighters";
import { fightInclude, hydrateFights, type FightCard } from "./fights";

export const getDivisions = (activeOnly = true) =>
  db.division.findMany({ where: activeOnly ? { active: true } : {}, orderBy: { sortOrder: "asc" } });

async function nextFights(fighterIds: string[]): Promise<Map<string, FightCard>> {
  const fights = await hydrateFights(
    await db.fight.findMany({
      where: { status: { in: ["SCHEDULED", "LIVE"] }, OR: [{ fighterAId: { in: fighterIds } }, { fighterBId: { in: fighterIds } }] },
      include: fightInclude,
      orderBy: { event: { startsAt: "desc" } },
    }),
  );
  const map = new Map<string, FightCard>();
  for (const f of fights) {
    map.set(f.fighterAId, f);
    map.set(f.fighterBId, f);
  }
  return map;
}

export type RankedFighter = FighterCard & { nextFight: FightCard | null };

export async function getDivisionRankings(slug: string) {
  const division = await db.division.findUnique({ where: { slug } });
  if (!division) return null;
  const [reign, rankings] = await Promise.all([
    db.titleReign.findFirst({ where: { divisionId: division.id, lostAt: null }, include: { fighter: { include: fighterInclude } } }),
    db.ranking.findMany({ where: { divisionId: division.id, rank: { lte: 10 } }, orderBy: { rank: "asc" }, include: { fighter: { include: fighterInclude } } }),
  ]);
  const cards = await withRecords([...(reign ? [reign.fighter] : []), ...rankings.map((r) => r.fighter)]);
  const next = await nextFights(cards.map((c) => c.id));
  const byId = new Map(cards.map((c) => [c.id, { ...c, nextFight: next.get(c.id) ?? null }]));
  return {
    division,
    champion: reign ? { ...byId.get(reign.fighterId)!, wonAt: reign.wonAt } : null,
    contenders: rankings.map((r) => ({ rank: r.rank, previousRank: r.previousRank, fighter: byId.get(r.fighterId)! })),
  };
}

export async function getChampions() {
  const divisions = await getDivisions();
  const reigns = await db.titleReign.findMany({ where: { lostAt: null }, include: { fighter: { include: fighterInclude }, division: true } });
  const cards = await withRecords(reigns.map((r) => r.fighter));
  const next = await nextFights(cards.map((c) => c.id));
  const defenses = await db.fight.findMany({
    where: { isTitleFight: true, status: "COMPLETED", winnerId: { in: cards.map((c) => c.id) } },
    select: { winnerId: true, divisionId: true, event: { select: { startsAt: true } } },
  });
  return divisions.map((division) => {
    const reign = reigns.find((r) => r.divisionId === division.id);
    const fighter = reign ? cards.find((c) => c.id === reign.fighterId)! : null;
    return {
      division,
      reign: reign ?? null,
      fighter,
      // Title-fight wins after the night the belt was won.
      defenses: reign ? defenses.filter((d) => d.winnerId === reign.fighterId && d.divisionId === division.id && d.event.startsAt > reign.wonAt).length : 0,
      nextFight: fighter ? next.get(fighter.id) ?? null : null,
    };
  });
}

export async function getTitleHistory(divisionId: string) {
  const [reigns, titleFights] = await Promise.all([
    db.titleReign.findMany({ where: { divisionId }, orderBy: { wonAt: "desc" }, include: { fighter: { include: { country: true } } } }),
    hydrateFights(await db.fight.findMany({ where: { divisionId, isTitleFight: true }, include: fightInclude, orderBy: { event: { startsAt: "desc" } } })),
  ]);
  return { reigns, titleFights };
}

/**
 * National rankings, computed from league data (never hard-coded):
 * champions ×25, ranked contenders by position, ACL wins ×3, active fighters ×1, affiliated gyms ×2.
 */
export async function getCountryRankings() {
  const [countries, fighters, wins, gyms] = await Promise.all([
    db.country.findMany(),
    db.fighter.findMany({ where: { status: "ACTIVE" }, select: { id: true, countryCode: true, ranking: { select: { rank: true } }, titleReigns: { where: { lostAt: null }, select: { id: true } } } }),
    db.fight.findMany({ where: { status: "COMPLETED", winnerId: { not: null } }, select: { winner: { select: { countryCode: true } } } }),
    db.gym.groupBy({ by: ["countryCode"], _count: true, where: { aclAffiliated: true } }),
  ]);
  const gymsAll = await db.gym.groupBy({ by: ["countryCode"], _count: true });
  const rows = countries.map((c) => {
    const mine = fighters.filter((f) => f.countryCode === c.code);
    const champions = mine.filter((f) => f.titleReigns.length).length;
    const ranked = mine.filter((f) => f.ranking && f.ranking.rank <= 10);
    const aclWins = wins.filter((w) => w.winner?.countryCode === c.code).length;
    const affiliated = gyms.find((g) => g.countryCode === c.code)?._count ?? 0;
    const score = champions * 25 + ranked.reduce((n, f) => n + (11 - f.ranking!.rank), 0) + aclWins * 3 + mine.length + affiliated * 2;
    return { country: c, fighters: mine.length, champions, ranked: ranked.length, aclWins, gyms: gymsAll.find((g) => g.countryCode === c.code)?._count ?? 0, score };
  });
  return rows.filter((r) => r.score > 0 || r.gyms > 0).sort((a, b) => b.score - a.score || a.country.name.localeCompare(b.country.name));
}
