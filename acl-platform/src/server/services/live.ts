import "server-only";
import { db } from "../db";
import { totalStats } from "./fights";

/** Snapshot pushed to scoreboards. Small and flat so it can travel over SSE/WebSocket to web, mobile and TV clients. */
export async function getLiveSnapshot(eventId: string) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true, status: true, name: true,
      fights: {
        orderBy: { order: "desc" },
        select: {
          id: true, slug: true, status: true, position: true, rounds: true, roundMinutes: true, isTitleFight: true,
          currentRound: true, clockSeconds: true, clockRunning: true, clockUpdatedAt: true,
          winnerId: true, method: true, endRound: true, endTime: true,
          fighterA: { select: { id: true, slug: true, firstName: true, lastName: true, countryCode: true } },
          fighterB: { select: { id: true, slug: true, firstName: true, lastName: true, countryCode: true } },
          division: { select: { name: true } },
          scorecards: { select: { judge: true, scoreA: true, scoreB: true } },
          roundStats: true,
          commentary: { orderBy: { createdAt: "desc" }, take: 12, select: { id: true, round: true, text: true, createdAt: true } },
        },
      },
    },
  });
  if (!event) return null;
  const fights = event.fights.map(({ roundStats, ...f }) => ({
    ...f,
    statsA: totalStats(roundStats, f.fighterA.id),
    statsB: totalStats(roundStats, f.fighterB.id),
  }));
  const current = fights.find((f) => f.status === "LIVE") ?? null;
  return { eventId: event.id, status: event.status, serverTime: new Date().toISOString(), current, fights };
}

export type LiveSnapshot = NonNullable<Awaited<ReturnType<typeof getLiveSnapshot>>>;
export type LiveFight = LiveSnapshot["fights"][number];
