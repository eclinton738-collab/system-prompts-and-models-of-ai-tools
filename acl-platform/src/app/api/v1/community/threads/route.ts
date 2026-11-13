import { z } from "zod";
import { route } from "@/server/api";
import { db } from "@/server/db";
import { awardPoints } from "@/server/services/engagement";

const body = z.object({ title: z.string().trim().min(5, "Give your thread a longer title").max(140), body: z.string().trim().min(10, "Say a little more").max(5000), category: z.enum(["DISCUSSION", "EVENT", "FAN_CLUB"]) });
// Fighter Q&A threads are opened by staff through the CMS.
export const POST = route({ auth: true, body, limit: 5 }, async ({ user, body }) => {
  const t = await db.thread.create({ data: { ...body, authorId: user.id } });
  await awardPoints(user.id, "COMMUNITY_POST", `thread:${t.id}`);
  return { id: t.id };
});
