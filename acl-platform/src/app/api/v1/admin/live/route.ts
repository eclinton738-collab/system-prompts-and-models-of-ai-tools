import { z } from "zod";
import { route, ApiError } from "@/server/api";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { finaliseFight } from "@/server/admin/resources";

const n = z.number().int().min(0).max(999);
const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("event_status"), eventId: z.string(), status: z.enum(["SCHEDULED", "LIVE", "COMPLETED"]) }),
  z.object({ action: z.literal("fight_start"), fightId: z.string() }),
  z.object({ action: z.literal("round"), fightId: z.string(), round: z.number().int().min(1).max(15) }),
  z.object({ action: z.literal("clock"), fightId: z.string(), running: z.boolean() }),
  z.object({ action: z.literal("commentary"), fightId: z.string(), text: z.string().trim().min(2).max(400) }),
  z.object({ action: z.literal("stats"), fightId: z.string(), side: z.enum(["A", "B"]), round: z.number().int().min(1).max(15), jabsThrown: n, jabsLanded: n, powerThrown: n, powerLanded: n, bodyLanded: n, headLanded: n, knockdowns: n }),
  z.object({ action: z.literal("scorecard"), fightId: z.string(), judge: z.string().trim().min(2).max(80), scoreA: n, scoreB: n }),
  z.object({ action: z.literal("result"), fightId: z.string(), winner: z.enum(["A", "B", "NONE"]), method: z.enum(["KO", "TKO", "UD", "SD", "MD", "DRAW", "RTD", "DQ", "NC"]), endRound: z.number().int().min(1).max(15).nullish(), endTime: z.string().regex(/^\d:\d\d$/, "Use m:ss").nullish() }),
  z.object({ action: z.literal("reset"), fightId: z.string() }),
]);

/**
 * Live console commands. This is the single write path for live state, so an automated
 * scoring/statistics provider can drive the scoreboard by calling the same actions.
 */
export const POST = route({ permission: "live.manage", body, limit: 240 }, async ({ user, body }) => {
  if (body.action === "event_status") {
    await db.event.update({ where: { id: body.eventId }, data: { status: body.status } });
    if (body.status !== "LIVE") await db.fight.updateMany({ where: { eventId: body.eventId, status: "LIVE" }, data: { status: "SCHEDULED", clockRunning: false } });
    await audit(user!.id, "live_event_status", "event", body.eventId, body.status);
    return { ok: true };
  }
  const fight = await db.fight.findUnique({ where: { id: body.fightId }, include: { event: { select: { status: true } } } });
  if (!fight) throw new ApiError(404, "not_found", "Fight not found.");
  const full = fight.roundMinutes * 60;
  const remaining = () => (fight.clockRunning && fight.clockUpdatedAt ? Math.max(0, (fight.clockSeconds ?? full) - Math.floor((Date.now() - fight.clockUpdatedAt.getTime()) / 1000)) : fight.clockSeconds ?? full);
  switch (body.action) {
    case "fight_start":
      if (fight.event.status !== "LIVE") throw new ApiError(409, "event_not_live", "Set the event live before starting a fight.");
      await db.fight.updateMany({ where: { eventId: fight.eventId, status: "LIVE", NOT: { id: fight.id } }, data: { status: "SCHEDULED", clockRunning: false } });
      await db.fight.update({ where: { id: fight.id }, data: { status: "LIVE", currentRound: 1, clockSeconds: full, clockRunning: false, clockUpdatedAt: new Date(), winnerId: null, method: null, endRound: null, endTime: null } });
      break;
    case "round":
      if (body.round > fight.rounds) throw new ApiError(422, "validation", `This fight is scheduled for ${fight.rounds} rounds.`);
      await db.fight.update({ where: { id: fight.id }, data: { currentRound: body.round, clockSeconds: full, clockRunning: false, clockUpdatedAt: new Date() } });
      break;
    case "clock":
      await db.fight.update({ where: { id: fight.id }, data: { clockSeconds: remaining(), clockRunning: body.running, clockUpdatedAt: new Date() } });
      break;
    case "commentary":
      await db.commentary.create({ data: { fightId: fight.id, round: fight.currentRound, text: body.text } });
      break;
    case "stats": {
      const fighterId = body.side === "A" ? fight.fighterAId : fight.fighterBId;
      if (body.jabsLanded > body.jabsThrown || body.powerLanded > body.powerThrown) throw new ApiError(422, "validation", "Landed punches cannot exceed thrown punches.");
      const { action: _a, fightId: _f, side: _s, round, ...nums } = body;
      await db.fightRoundStat.upsert({ where: { fightId_fighterId_round: { fightId: fight.id, fighterId, round } }, update: { ...nums, source: "manual" }, create: { fightId: fight.id, fighterId, round, ...nums, source: "manual" } });
      break;
    }
    case "scorecard": {
      const existing = await db.scorecard.findFirst({ where: { fightId: fight.id, judge: body.judge } });
      if (existing) await db.scorecard.update({ where: { id: existing.id }, data: { scoreA: body.scoreA, scoreB: body.scoreB } });
      else await db.scorecard.create({ data: { fightId: fight.id, judge: body.judge, scoreA: body.scoreA, scoreB: body.scoreB } });
      break;
    }
    case "result": {
      const drawn = body.method === "DRAW" || body.method === "NC";
      if (drawn !== (body.winner === "NONE")) throw new ApiError(422, "validation", drawn ? "A draw or no contest has no winner." : "Select the winner.");
      await db.fight.update({ where: { id: fight.id }, data: { status: "COMPLETED", winnerId: body.winner === "A" ? fight.fighterAId : body.winner === "B" ? fight.fighterBId : null, method: body.method, endRound: body.endRound ?? null, endTime: body.endTime ?? null, clockRunning: false } });
      await finaliseFight(fight.id);
      break;
    }
    case "reset":
      await db.fight.update({ where: { id: fight.id }, data: { status: "SCHEDULED", currentRound: null, clockSeconds: null, clockRunning: false, winnerId: null, method: null, endRound: null, endTime: null } });
      break;
  }
  await audit(user!.id, `live_${body.action}`, "fight", fight.id);
  return { ok: true };
});
