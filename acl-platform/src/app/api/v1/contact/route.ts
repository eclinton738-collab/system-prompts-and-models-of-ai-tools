import { z } from "zod";
import { route } from "@/server/api";
import { db } from "@/server/db";

const body = z.object({ name: z.string().trim().min(2, "Name is required").max(100), email: z.string().trim().email("Enter a valid email").max(200), topic: z.string({ invalid_type_error: "Choose a topic" }).trim().min(2, "Choose a topic").max(60), message: z.string().trim().min(10, "Tell us a little more").max(4000) });
export const POST = route({ body, limit: 4 }, async ({ body }) => {
  await db.contactMessage.create({ data: body });
  return { ok: true };
});
