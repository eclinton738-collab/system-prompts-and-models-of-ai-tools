import { z } from "zod";
import { route, ApiError } from "@/server/api";
import { db } from "@/server/db";
import { notify, notifyFollowers } from "@/server/services/engagement";
import { audit } from "@/server/audit";

const body = z.object({
  audience: z.enum(["all", "followers", "country", "premium"]), fighterId: z.string().nullish(), countryCode: z.string().nullish(),
  type: z.enum(["FIGHT_ANNOUNCEMENT", "FIGHTER_FIGHT", "EVENT_REMINDER", "RESULT", "RANKING", "BREAKING_NEWS", "TICKET_RELEASE", "MERCH_DROP", "NEW_VIDEO"]),
  title: z.string().trim().min(3, "Add a title").max(120), body: z.string().trim().min(3, "Add a message").max(300), url: z.string().trim().regex(/^\//, "Use a site path such as /events/…").max(200).nullish(),
});
export const POST = route({ permission: "notifications.send", body, limit: 10 }, async ({ user, body }) => {
  const n = { type: body.type, title: body.title, body: body.body, url: body.url ?? undefined };
  let sent = 0;
  if (body.audience === "followers") {
    if (!body.fighterId) throw new ApiError(422, "validation", "Choose a fighter.", { fighterId: "Required for this audience" });
    sent = await notifyFollowers([body.fighterId], n);
  } else {
    if (body.audience === "country" && !body.countryCode) throw new ApiError(422, "validation", "Choose a country.", { countryCode: "Required for this audience" });
    const users = await db.user.findMany({ where: { disabled: false, ...(body.audience === "country" && { countryCode: body.countryCode! }), ...(body.audience === "premium" && { premium: true }) }, select: { id: true } });
    sent = await notify(users.map((u) => u.id), n);
  }
  await audit(user!.id, "broadcast", "notification", null, `${body.audience}: ${body.title} → ${sent} recipients`);
  return { sent };
});
