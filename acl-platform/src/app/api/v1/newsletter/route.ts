import { z } from "zod";
import { route } from "@/server/api";
import { db } from "@/server/db";

const body = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email").max(200) });
export const POST = route({ body, limit: 5 }, async ({ body }) => {
  await db.newsletterSubscriber.upsert({ where: { email: body.email }, update: {}, create: { email: body.email } });
  return { ok: true };
});
