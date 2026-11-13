import { z } from "zod";
import { route } from "@/server/api";
import { db } from "@/server/db";
import { awardPoints, evaluateBadges } from "@/server/services/engagement";
import { track } from "@/server/services/analytics";

const body = z.object({ kind: z.enum(["read", "watch"]), id: z.string().min(1).max(40), visitorId: z.string().max(64).optional() });
/** Records that a visitor read an article or watched a video; credits points for signed-in fans. */
export const POST = route({ body, limit: 60 }, async ({ user, body }) => {
  if (body.kind === "watch") {
    const video = await db.video.findUnique({ where: { id: body.id }, select: { id: true, premium: true } });
    if (!video) return { ok: false };
    await db.video.update({ where: { id: video.id }, data: { views: { increment: 1 } } });
    await track({ type: "video_view", entityType: "video", entityId: video.id, userId: user?.id, visitorId: body.visitorId });
    if (user && (!video.premium || user.premium)) {
      await db.videoView.upsert({ where: { userId_videoId: { userId: user.id, videoId: video.id } }, update: {}, create: { userId: user.id, videoId: video.id } });
      await awardPoints(user.id, "WATCH_VIDEO", video.id);
      await evaluateBadges(user.id);
    }
  } else if (user && (await db.article.findUnique({ where: { id: body.id }, select: { id: true } }))) await awardPoints(user.id, "READ_ARTICLE", body.id);
  return { ok: true };
});
