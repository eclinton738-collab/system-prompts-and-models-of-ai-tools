import { z } from "zod";
import { route, notFound } from "@/server/api";
import { db } from "@/server/db";
import { awardPoints, evaluateBadges } from "@/server/services/engagement";
import { track } from "@/server/services/analytics";

export const GET = route({ auth: true }, async ({ user }) => db.follow.findMany({ where: { userId: user.id }, select: { fighterId: true, notify: true, fighter: { select: { slug: true, firstName: true, lastName: true } } } }));

const body = z.object({ fighterId: z.string().min(1), on: z.boolean() });
export const POST = route({ auth: true, body }, async ({ user, body }) => {
  if (!(await db.fighter.findUnique({ where: { id: body.fighterId }, select: { id: true } }))) notFound("Fighter");
  const key = { userId_fighterId: { userId: user.id, fighterId: body.fighterId } };
  if (body.on) {
    await db.follow.upsert({ where: key, update: {}, create: { userId: user.id, fighterId: body.fighterId } });
    await awardPoints(user.id, "FOLLOW_FIGHTER", body.fighterId);
    await evaluateBadges(user.id);
    await track({ type: "follow", userId: user.id, entityType: "fighter", entityId: body.fighterId });
  } else await db.follow.deleteMany({ where: { userId: user.id, fighterId: body.fighterId } });
  return { following: body.on };
});
