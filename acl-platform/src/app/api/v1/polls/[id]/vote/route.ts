import { z } from "zod";
import { route, ApiError } from "@/server/api";
import { db } from "@/server/db";

const body = z.object({ choice: z.string().min(1) });
export const POST = route({ auth: true, body }, async ({ user, body, params }) => {
  const option = await db.pollOption.findFirst({ where: { id: body.choice, pollId: params.id, poll: { active: true } } });
  if (!option) throw new ApiError(404, "not_found", "That poll option does not exist or the poll has closed.");
  await db.pollVote.upsert({ where: { pollId_userId: { pollId: params.id, userId: user.id } }, update: { optionId: option.id }, create: { pollId: params.id, userId: user.id, optionId: option.id } });
  return { ok: true };
});
