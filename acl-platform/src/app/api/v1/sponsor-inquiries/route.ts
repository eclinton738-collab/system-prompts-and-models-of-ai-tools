import { z } from "zod";
import { route } from "@/server/api";
import { db } from "@/server/db";

const body = z.object({ company: z.string().trim().min(2, "Company is required").max(120), name: z.string().trim().min(2, "Name is required").max(100), email: z.string().trim().email("Enter a valid email").max(200), phone: z.string().trim().max(40).nullish(), country: z.string().trim().max(80).nullish(), budget: z.string().max(40).nullish(), interests: z.array(z.string().max(60)).max(10).default([]), message: z.string().trim().min(10, "Tell us a little more").max(4000) });
export const POST = route({ body, limit: 4 }, async ({ body }) => {
  await db.sponsorInquiry.create({ data: body });
  return { ok: true };
});
