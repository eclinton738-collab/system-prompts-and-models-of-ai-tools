import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { isStoppage } from "@/lib/format";

export const fighterInclude = {
  country: true,
  division: true,
  ranking: true,
  titleReigns: { where: { lostAt: null }, select: { id: true, divisionId: true, wonAt: true } },
} satisfies Prisma.FighterInclude;

type FighterRow = Prisma.FighterGetPayload<{ include: typeof fighterInclude }>;

export type FighterRecord = {
  wins: number;
  losses: number;
  draws: number;
  kos: number;
  decisionWins: number;
  koPct: number;
  winPct: number;
  aclFights: number;
  bonuses: number;
  /** Most recent ACL results first. */
  form: ("W" | "L" | "D")[];
};

export type FighterCard = FighterRow & { record: FighterRecord; isChampion: boolean };

export const fighterName = (f: { firstName: string; lastName: string }) => `${f.firstName} ${f.lastName}`;
export const fighterFullName = (f: { firstName: string; lastName: string; nickname?: string | null }) =>
  f.nickname ? `${f.firstName} “${f.nickname}” ${f.lastName}` : fighterName(f);
export const recordLine = (r: FighterRecord) => `${r.wins}–${r.losses}–${r.draws}`;

type Prior = { id: string; priorWins: number; priorLosses: number; priorDraws: number; priorKos: number };

/**
 * Professional record = pre-ACL record + completed ACL bouts.
 * Derived on read so results entered in the CMS update every profile at once.
 */
export async function getRecords(fighters: Prior[]): Promise<Map<string, FighterRecord>> {
  const ids = fighters.map((f) => f.id);
  const fights = ids.length
    ? await db.fight.findMany({
        where: { status: "COMPLETED", OR: [{ fighterAId: { in: ids } }, { fighterBId: { in: ids } }] },
        select: { fighterAId: true, fighterBId: true, winnerId: true, method: true, performanceBonus: true, event: { select: { startsAt: true } } },
        orderBy: { event: { startsAt: "desc" } },
      })
    : [];
  const map = new Map<string, FighterRecord>();
  for (const f of fighters) {
    map.set(f.id, { wins: f.priorWins, losses: f.priorLosses, draws: f.priorDraws, kos: f.priorKos, decisionWins: 0, koPct: 0, winPct: 0, aclFights: 0, bonuses: 0, form: [] });
  }
  for (const fight of fights) {
    if (fight.method === "NC") continue;
    for (const id of [fight.fighterAId, fight.fighterBId]) {
      const r = map.get(id);
      if (!r) continue;
      r.aclFights++;
      if (!fight.winnerId) {
        r.draws++;
        r.form.push("D");
      } else if (fight.winnerId === id) {
        r.wins++;
        r.form.push("W");
        if (isStoppage(fight.method)) r.kos++;
        if (fight.performanceBonus) r.bonuses++;
      } else {
        r.losses++;
        r.form.push("L");
      }
    }
  }
  for (const r of map.values()) {
    const total = r.wins + r.losses + r.draws;
    r.decisionWins = r.wins - r.kos;
    r.koPct = r.wins ? Math.round((r.kos / r.wins) * 100) : 0;
    r.winPct = total ? Math.round((r.wins / total) * 100) : 0;
  }
  return map;
}

export async function withRecords<T extends FighterRow>(rows: T[]): Promise<(T & { record: FighterRecord; isChampion: boolean })[]> {
  const records = await getRecords(rows);
  return rows.map((f) => ({ ...f, record: records.get(f.id)!, isChampion: f.titleReigns.length > 0 }));
}

export type FighterFilters = {
  q?: string;
  country?: string;
  division?: string;
  gender?: string;
  status?: string;
  champion?: boolean;
  gym?: string;
  style?: string;
  minAge?: number;
  maxAge?: number;
  undefeated?: boolean;
  sort?: string;
};

export async function listFighters(f: FighterFilters = {}): Promise<FighterCard[]> {
  const now = new Date();
  const dobFor = (years: number) => new Date(Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate()));
  const where: Prisma.FighterWhereInput = {
    ...(f.q && {
      OR: [
        { firstName: { contains: f.q, mode: "insensitive" } },
        { lastName: { contains: f.q, mode: "insensitive" } },
        { nickname: { contains: f.q, mode: "insensitive" } },
      ],
    }),
    ...(f.country && { countryCode: f.country }),
    ...(f.division && { division: { slug: f.division } }),
    ...(f.gender && (f.gender === "MEN" || f.gender === "WOMEN") && { gender: f.gender }),
    ...(f.status && ["ACTIVE", "INACTIVE", "RETIRED"].includes(f.status) && { status: f.status as "ACTIVE" }),
    ...(f.champion && { titleReigns: { some: { lostAt: null } } }),
    ...(f.gym && { gym: { slug: f.gym } }),
    ...(f.style && { style: f.style }),
    ...((f.minAge || f.maxAge) && {
      dateOfBirth: { ...(f.minAge && { lte: dobFor(f.minAge) }), ...(f.maxAge && { gt: dobFor(f.maxAge + 1) }) },
    }),
  };
  const rows = await db.fighter.findMany({ where, include: fighterInclude, orderBy: [{ lastName: "asc" }] });
  let cards = await withRecords(rows);
  if (f.undefeated) cards = cards.filter((c) => c.record.losses === 0);
  const rankValue = (c: FighterCard) => (c.isChampion ? 0 : c.ranking?.rank ?? 99);
  switch (f.sort) {
    case "name":
      break;
    case "wins":
      cards.sort((a, b) => b.record.wins - a.record.wins);
      break;
    case "ko":
      cards.sort((a, b) => b.record.koPct - a.record.koPct);
      break;
    default:
      cards.sort((a, b) => rankValue(a) - rankValue(b) || b.record.wins - a.record.wins);
  }
  return cards;
}

export async function getFighterCards(where: Prisma.FighterWhereInput, take?: number): Promise<FighterCard[]> {
  return withRecords(await db.fighter.findMany({ where, include: fighterInclude, take }));
}

/** Fighters ordered by fan following — "who are the stars / who is rising". */
export async function getTrendingFighters(take = 6): Promise<(FighterCard & { followers: number })[]> {
  const rows = await db.fighter.findMany({
    where: { status: "ACTIVE" },
    include: { ...fighterInclude, _count: { select: { followers: true } } },
    orderBy: [{ followers: { _count: "desc" } }, { featured: "desc" }],
    take,
  });
  const cards = await withRecords(rows);
  return cards.map((c) => ({ ...c, followers: c._count.followers }));
}

export async function getFighterProfile(slug: string) {
  const row = await db.fighter.findUnique({
    where: { slug },
    include: {
      ...fighterInclude,
      gym: true,
      coach: true,
      titleReigns: { include: { division: true }, orderBy: { wonAt: "desc" } },
      _count: { select: { followers: true } },
      photos: { orderBy: { createdAt: "desc" }, take: 12 },
      products: { where: { active: true }, take: 4 },
    },
  });
  if (!row) return null;
  const records = await getRecords([row]);
  return { ...row, record: records.get(row.id)!, isChampion: row.titleReigns.some((t) => !t.lostAt), followers: row._count.followers };
}
