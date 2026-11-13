import { z } from "zod";
import { route, ApiError } from "@/server/api";
import { db } from "@/server/db";
import { audit } from "@/server/audit";

const KEYS = ["demoMode", "contactEmail", "pressEmail", "partnershipsEmail", "instagramUrl", "tiktokUrl", "youtubeUrl", "xUrl", "facebookUrl"] as const;
const body = z.object(Object.fromEntries(KEYS.map((k) => [k, z.union([z.string().max(300), z.boolean(), z.null()]).optional()])));
export const PUT = route({ permission: "settings.manage", body }, async ({ user, body }) => {
  for (const k of KEYS) {
    if (!(k in body)) continue;
    const raw = (body as Record<string, unknown>)[k];
    const value = typeof raw === "boolean" ? String(raw) : (raw ?? "").toString().trim();
    if (k.endsWith("Url") && value && !/^https:\/\//i.test(value)) throw new ApiError(422, "validation", "Social links must start with https://", { [k]: "Must start with https://" });
    await db.siteSetting.upsert({ where: { key: k }, update: { value }, create: { key: k, value } });
  }
  await audit(user!.id, "update", "settings", null, Object.keys(body).join(", "));
  return { ok: true };
});
