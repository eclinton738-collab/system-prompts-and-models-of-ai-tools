import { z } from "zod";
import { route, ApiError, notFound } from "@/server/api";
import { db } from "@/server/db";
import { awardPoints } from "@/server/services/engagement";
import { track } from "@/server/services/analytics";

const body = z.object({ fightId: z.string().min(1), pickFighterId: z.string().min(1), method: z.enum(["KO/TKO", "Decision"]).nullish(), round: z.number().int().min(1).max(15).nullish() });

/** Fan prediction. Engagement only: no stake is taken and nothing of monetary value is awarded. */
export const POST = route({ auth: true, body }, async ({ user, body }) => {
  const fight = await db.fight.findUnique({ where: { id: body.fightId }, select: { status: true, fighterAId: true, fighterBId: true, rounds: true } });
  if (!fight) notFound("Fight");
  if (fight.status !== "SCHEDULED") throw new ApiError(409, "closed", "Predictions are closed for this fight.");
  if (![fight.fighterAId, fight.fighterBId].includes(body.pickFighterId)) throw new ApiError(422, "validation", "Pick one of the two fighters.");
  const round = body.method === "KO/TKO" && body.round && body.round <= fight.rounds ? body.round : null;
  const data = { pickFighterId: body.pickFighterId, method: body.method ?? null, round };
  await db.prediction.upsert({ where: { userId_fightId: { userId: user.id, fightId: body.fightId } }, update: data, create: { ...data, userId: user.id, fightId: body.fightId } });
  if (await awardPoints(user.id, "PREDICT_FIGHT", body.fightId)) await track({ type: "prediction", userId: user.id, entityType: "fight", entityId: body.fightId });
  return { ok: true };
});
