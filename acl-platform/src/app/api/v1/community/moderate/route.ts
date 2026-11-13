import { z } from "zod";
import { route } from "@/server/api";
import { db } from "@/server/db";
import { audit } from "@/server/audit";

const body = z.object({ threadId: z.string().optional(), postId: z.string().optional(), action: z.enum(["hide", "restore", "lock", "unlock", "pin", "unpin"]) });
export const POST = route({ permission: "community.moderate", body }, async ({ user, body }) => {
  const a = body.action;
  if (body.postId) await db.post.update({ where: { id: body.postId }, data: { status: a === "hide" ? "HIDDEN" : "VISIBLE" } });
  if (body.threadId) await db.thread.update({ where: { id: body.threadId }, data: a === "hide" ? { status: "HIDDEN" } : a === "restore" ? { status: "VISIBLE" } : a === "lock" ? { locked: true } : a === "unlock" ? { locked: false } : { pinned: a === "pin" } });
  await db.report.updateMany({ where: { OR: [{ postId: body.postId ?? "-" }, { threadId: body.threadId ?? "-" }] }, data: { resolved: true } });
  await audit(user!.id, `moderate_${a}`, body.postId ? "post" : "thread", body.postId ?? body.threadId);
  return { ok: true };
});
