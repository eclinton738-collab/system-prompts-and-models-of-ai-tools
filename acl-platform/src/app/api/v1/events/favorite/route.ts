import { z } from "zod";
import { route, notFound } from "@/server/api";
import { db } from "@/server/db";

const body = z.object({ eventId: z.string().min(1), on: z.boolean() });
export const POST = route({ auth: true, body }, async ({ user, body }) => {
  if (!(await db.event.findUnique({ where: { id: body.eventId }, select: { id: true } }))) notFound("Event");
  if (body.on) await db.eventFavorite.upsert({ where: { userId_eventId: { userId: user.id, eventId: body.eventId } }, update: {}, create: { userId: user.id, eventId: body.eventId } });
  else await db.eventFavorite.deleteMany({ where: { userId: user.id, eventId: body.eventId } });
  return { saved: body.on };
});
