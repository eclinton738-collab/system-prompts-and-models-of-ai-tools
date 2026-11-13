import { z } from "zod";
import { route, notFound } from "@/server/api";
import { db } from "@/server/db";

const body = z.object({ videoId: z.string().min(1), on: z.boolean() });
export const POST = route({ auth: true, body }, async ({ user, body }) => {
  if (!(await db.video.findUnique({ where: { id: body.videoId }, select: { id: true } }))) notFound("Video");
  if (body.on) await db.watchlistItem.upsert({ where: { userId_videoId: { userId: user.id, videoId: body.videoId } }, update: {}, create: { userId: user.id, videoId: body.videoId } });
  else await db.watchlistItem.deleteMany({ where: { userId: user.id, videoId: body.videoId } });
  return { saved: body.on };
});
