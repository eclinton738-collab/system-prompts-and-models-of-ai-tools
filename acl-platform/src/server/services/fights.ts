import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { fighterInclude, getRecords, fighterName, type FighterCard } from "./fighters";
import { methodLabel } from "@/lib/format";

export const fightInclude = {
  event: { include: { country: true } },
  division: true,
  fighterA: { include: fighterInclude },
  fighterB: { include: fighterInclude },
} satisfies Prisma.FightInclude;

type FightRow = Prisma.FightGetPayload<{ include: typeof fightInclude }>;
export type FightCard = Omit<FightRow, "fighterA" | "fighterB"> & { fighterA: FighterCard; fighterB: FighterCard };

export async function hydrateFights<T extends FightRow>(rows: T[]): Promise<(Omit<T, "fighterA" | "fighterB"> & { fighterA: FighterCard; fighterB: FighterCard })[]> {
  const fighters = new Map<string, FightRow["fighterA"]>();
  for (const r of rows) {
    fighters.set(r.fighterA.id, r.fighterA);
    fighters.set(r.fighterB.id, r.fighterB);
  }
  const records = await getRecords([...fighters.values()]);
  const card = (f: FightRow["fighterA"]): FighterCard => ({ ...f, record: records.get(f.id)!, isChampion: f.titleReigns.length > 0 });
  return rows.map((r) => ({ ...r, fighterA: card(r.fighterA), fighterB: card(r.fighterB) }));
}

export async function listFights(opts: { status?: "SCHEDULED" | "LIVE" | "COMPLETED"; eventId?: string; fighterId?: string; divisionId?: string; take?: number } = {}): Promise<FightCard[]> {
  const rows = await db.fight.findMany({
    where: {
      ...(opts.status ? { status: opts.status } : { status: { not: "CANCELLED" } }),
      ...(opts.eventId && { eventId: opts.eventId }),
      ...(opts.divisionId && { divisionId: opts.divisionId }),
      ...(opts.fighterId && { OR: [{ fighterAId: opts.fighterId }, { fighterBId: opts.fighterId }] }),
    },
    include: fightInclude,
    orderBy: [{ event: { startsAt: opts.status === "SCHEDULED" ? "asc" : "desc" } }, { order: "desc" }],
    take: opts.take,
  });
  return hydrateFights(rows);
}

export async function getFight(slug: string) {
  const row = await db.fight.findUnique({
    where: { slug },
    include: {
      ...fightInclude,
      roundStats: { orderBy: { round: "asc" } },
      scorecards: true,
      commentary: { orderBy: { createdAt: "desc" }, take: 40 },
      videos: { where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" } },
      rivalries: { select: { slug: true, title: true } },
    },
  });
  if (!row) return null;
  const [fight] = await hydrateFights([row]);
  return fight;
}

export type FightDetail = NonNullable<Awaited<ReturnType<typeof getFight>>>;

export const fightTitle = (f: { fighterA: { firstName: string; lastName: string }; fighterB: { firstName: string; lastName: string } }) =>
  `${fighterName(f.fighterA)} vs ${fighterName(f.fighterB)}`;

export function resultLine(f: Pick<FightCard, "status" | "winnerId" | "method" | "endRound" | "endTime" | "fighterA" | "fighterB">): string | null {
  if (f.status !== "COMPLETED") return null;
  if (f.method === "NC") return "No contest";
  if (!f.winnerId) return `Draw${f.method && f.method !== "DRAW" ? ` (${methodLabel(f.method)})` : ""}`;
  const w = f.winnerId === f.fighterA.id ? f.fighterA : f.fighterB;
  const l = f.winnerId === f.fighterA.id ? f.fighterB : f.fighterA;
  const how = [methodLabel(f.method), f.endRound ? `R${f.endRound}` : null, f.endTime].filter(Boolean).join(" · ");
  return `${w.lastName} def. ${l.lastName}${how ? ` — ${how}` : ""}`;
}

/** Aggregated punch stats per fighter for a fight. Returns null when no stats were recorded. */
export function totalStats(stats: { fighterId: string; jabsThrown: number; jabsLanded: number; powerThrown: number; powerLanded: number; bodyLanded: number; headLanded: number; knockdowns: number }[], fighterId: string) {
  const mine = stats.filter((s) => s.fighterId === fighterId);
  if (!mine.length) return null;
  const sum = (k: keyof (typeof mine)[number]) => mine.reduce((n, s) => n + (s[k] as number), 0);
  const thrown = sum("jabsThrown") + sum("powerThrown");
  const landed = sum("jabsLanded") + sum("powerLanded");
  return {
    thrown,
    landed,
    accuracy: thrown ? Math.round((landed / thrown) * 100) : 0,
    jabsThrown: sum("jabsThrown"),
    jabsLanded: sum("jabsLanded"),
    powerThrown: sum("powerThrown"),
    powerLanded: sum("powerLanded"),
    bodyLanded: sum("bodyLanded"),
    headLanded: sum("headLanded"),
    knockdowns: sum("knockdowns"),
  };
}

/** Fan prediction split for a fight. */
export async function predictionSplit(fightId: string, fighterAId: string) {
  const groups = await db.prediction.groupBy({ by: ["pickFighterId"], where: { fightId }, _count: true });
  const total = groups.reduce((n, g) => n + g._count, 0);
  const a = groups.find((g) => g.pickFighterId === fighterAId)?._count ?? 0;
  return { total, a, b: total - a, aPct: total ? Math.round((a / total) * 100) : 50, bPct: total ? 100 - Math.round((a / total) * 100) : 50 };
}
