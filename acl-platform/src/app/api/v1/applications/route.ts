import { z } from "zod";
import { route, ApiError } from "@/server/api";
import { db } from "@/server/db";
import { age } from "@/lib/format";

const url = z.string().trim().url("Each link must be a full URL starting with https://").max(400).refine((u) => /^https?:\/\//i.test(u), "Links must start with http:// or https://");
const body = z.object({
  fullName: z.string().trim().min(2).max(100), dateOfBirth: z.coerce.date({ errorMap: () => ({ message: "Enter your date of birth" }) }),
  countryCode: z.string().length(2, "Choose a country"), city: z.string().trim().min(2).max(80),
  weightKg: z.number({ invalid_type_error: "Enter your weight" }).min(40).max(200), heightCm: z.number({ invalid_type_error: "Enter your height" }).int().min(130).max(230), reachCm: z.number().int().min(130).max(240).nullish(),
  stance: z.enum(["ORTHODOX", "SOUTHPAW", "SWITCH"], { errorMap: () => ({ message: "Choose a stance" }) }),
  wins: z.number({ invalid_type_error: "Required" }).int().min(0).max(300), losses: z.number({ invalid_type_error: "Required" }).int().min(0).max(300), draws: z.number({ invalid_type_error: "Required" }).int().min(0).max(300),
  gymName: z.string().trim().max(120).nullish(), coachName: z.string().trim().max(120).nullish(), experience: z.string().trim().min(20, "Tell us more about your experience").max(4000),
  videoLinks: z.array(url).min(1, "Add at least one fight video link").max(10), photoLinks: z.array(url).max(10).default([]),
  phone: z.string().trim().min(6).max(40), email: z.string().trim().email().max(200),
});
export const POST = route({ auth: true, body, limit: 4 }, async ({ user, body }) => {
  if (age(body.dateOfBirth) < 18) throw new ApiError(422, "validation", "Applicants must be 18 or older.", { dateOfBirth: "You must be 18 or older" });
  if (!(await db.country.findUnique({ where: { code: body.countryCode } }))) throw new ApiError(422, "validation", "Unknown country.", { countryCode: "Choose a country" });
  if (await db.application.findFirst({ where: { userId: user.id, status: { notIn: ["DECLINED", "ACL_FIGHTER"] } } })) throw new ApiError(409, "exists", "You already have an application in progress.");
  const app = await db.application.create({ data: { ...body, userId: user.id, messages: { create: { fromStaff: true, body: "Thank you for applying to Africa Combat League. Your application has been received and will be reviewed by our scouting team." } } } });
  await db.notification.create({ data: { userId: user.id, type: "SYSTEM", title: "Application received", body: "Track your status in the fighter portal.", url: "/portal" } });
  return { id: app.id };
});
