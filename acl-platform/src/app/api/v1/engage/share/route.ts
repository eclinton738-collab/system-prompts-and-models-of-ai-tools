import { z } from "zod";
import { route } from "@/server/api";
import { awardPoints } from "@/server/services/engagement";
import { track } from "@/server/services/analytics";

const body = z.object({ path: z.string().max(300), channel: z.enum(["whatsapp", "x", "facebook", "instagram", "copy"]) });
export const POST = route({ body, limit: 30 }, async ({ user, body }) => {
  await track({ type: "share", path: body.path, source: body.channel, userId: user?.id });
  if (user) await awardPoints(user.id, "SHARE_CONTENT", `${body.path}:${new Date().toISOString().slice(0, 10)}`);
  return { ok: true };
});
