import { z } from "zod";
import { route } from "@/server/api";
import { db } from "@/server/db";

const body = z.object({ threadId: z.string().optional(), postId: z.string().optional(), reason: z.string().max(500).optional() }).refine((b) => b.threadId || b.postId, "Nothing to report");
export const POST = route({ auth: true, body, limit: 10 }, async ({ user, body }) => {
  await db.report.create({ data: { userId: user.id, threadId: body.threadId, postId: body.postId, reason: body.reason ?? "Reported by member" } });
  if (body.postId) await db.post.updateMany({ where: { id: body.postId, status: "VISIBLE" }, data: { status: "FLAGGED" } });
  return { ok: true };
});
