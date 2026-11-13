import { z } from "zod";
import { route, ApiError } from "@/server/api";
import { db } from "@/server/db";
import { awardPoints } from "@/server/services/engagement";

const body = z.object({ threadId: z.string().min(1), body: z.string().trim().min(2, "Write a reply").max(5000) });
export const POST = route({ auth: true, body, limit: 12 }, async ({ user, body }) => {
  const thread = await db.thread.findFirst({ where: { id: body.threadId, status: "VISIBLE" }, select: { locked: true } });
  if (!thread) throw new ApiError(404, "not_found", "Thread not found.");
  if (thread.locked) throw new ApiError(409, "locked", "This thread is locked.");
  const p = await db.post.create({ data: { threadId: body.threadId, body: body.body, authorId: user.id } });
  await awardPoints(user.id, "COMMUNITY_POST", `post:${new Date().toISOString().slice(0, 10)}`); // once per day
  return { id: p.id };
});
