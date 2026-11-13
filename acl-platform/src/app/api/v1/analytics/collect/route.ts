import { z } from "zod";
import { route } from "@/server/api";
import { track } from "@/server/services/analytics";

const body = z.object({ type: z.literal("page_view"), path: z.string().max(300), entityType: z.string().max(30).optional(), entityId: z.string().max(40).optional(), visitorId: z.string().max(64).optional(), referrer: z.string().max(500).optional() });
export const POST = route({ body, limit: 120 }, async ({ user, body, req }) => {
  let source = "direct";
  try {
    if (body.referrer) {
      const host = new URL(body.referrer).host.replace(/^www\./, "");
      if (host !== req.headers.get("host")) source = host;
    }
  } catch {}
  // Country comes from the CDN/edge header when deployed behind one.
  const country = req.headers.get("x-vercel-ip-country") ?? req.headers.get("cf-ipcountry") ?? undefined;
  await track({ type: "page_view", path: body.path, entityType: body.entityType, entityId: body.entityId, visitorId: body.visitorId, userId: user?.id, source, country });
  return { ok: true };
});
