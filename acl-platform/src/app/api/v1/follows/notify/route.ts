import { z } from "zod";
import { route, notFound } from "@/server/api";
import { db } from "@/server/db";

const body = z.object({ fighterId: z.string().min(1), on: z.boolean() });
/** "Notify me": turning alerts on also follows the fighter. */
export const POST = route({ auth: true, body }, async ({ user, body }) => {
  if (!(await db.fighter.findUnique({ where: { id: body.fighterId }, select: { id: true } }))) notFound("Fighter");
  if (body.on) await db.follow.upsert({ where: { userId_fighterId: { userId: user.id, fighterId: body.fighterId } }, update: { notify: true }, create: { userId: user.id, fighterId: body.fighterId, notify: true } });
  else await db.follow.updateMany({ where: { userId: user.id, fighterId: body.fighterId }, data: { notify: false } });
  return { notify: body.on };
});
