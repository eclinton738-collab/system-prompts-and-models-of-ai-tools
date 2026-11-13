import { z } from "zod";
import { route, notFound } from "@/server/api";
import { db } from "@/server/db";

const body = z.object({ choice: z.enum(["A", "B"]) });
export const POST = route({ auth: true, body }, async ({ user, body, params }) => {
  if (!(await db.rivalry.findUnique({ where: { id: params.id }, select: { id: true } }))) notFound("Rivalry");
  await db.rivalryVote.upsert({ where: { rivalryId_userId: { rivalryId: params.id, userId: user.id } }, update: { side: body.choice }, create: { rivalryId: params.id, userId: user.id, side: body.choice } });
  return { ok: true };
});
