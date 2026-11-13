import { z } from "zod";
import { route, ApiError } from "@/server/api";
import { db } from "@/server/db";
import { createSession, hashPassword } from "@/server/auth";
import { awardPoints } from "@/server/services/engagement";
import { track } from "@/server/services/analytics";
import { audit } from "@/server/audit";
import { slugify } from "@/lib/format";

const body = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(200),
  password: z.string().min(10, "Use at least 10 characters").max(200),
  countryCode: z.string().length(2).nullish(),
  city: z.string().trim().max(80).nullish(),
  terms: z.literal(true, { errorMap: () => ({ message: "Please accept the terms" }) }),
});

export const POST = route({ body, limit: 8 }, async ({ body, req }) => {
  if (await db.user.findUnique({ where: { email: body.email } })) throw new ApiError(409, "email_taken", "An account with that email already exists.", { email: "Already registered — sign in instead" });
  if (body.countryCode && !(await db.country.findUnique({ where: { code: body.countryCode } }))) throw new ApiError(422, "validation", "Unknown country.", { countryCode: "Choose a country from the list" });
  let handle = slugify(body.name) || "fan";
  if (await db.user.findUnique({ where: { handle } })) handle = `${handle}-${Math.random().toString(36).slice(2, 6)}`;
  // Public sign-up always creates a FAN. Elevated roles are granted only by an admin.
  const user = await db.user.create({ data: { name: body.name, email: body.email, handle, passwordHash: await hashPassword(body.password), countryCode: body.countryCode ?? null, city: body.city ?? null, preferences: { create: {} } } });
  await awardPoints(user.id, "SIGNUP", "signup");
  const founding = await db.badge.findUnique({ where: { slug: "founding-fan" } });
  if (founding) await db.userBadge.create({ data: { userId: user.id, badgeId: founding.id } });
  await db.notification.create({ data: { userId: user.id, type: "SYSTEM", title: "Welcome to ACL", body: "You start with 100 fan points. Follow a fighter to personalise your feed.", url: "/fighters" } });
  await createSession(user.id, req.headers.get("user-agent"));
  await track({ type: "signup", userId: user.id });
  await audit(user.id, "register", "user", user.id);
  return { id: user.id };
});
