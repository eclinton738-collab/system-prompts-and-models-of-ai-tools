import { z } from "zod";
import { route } from "@/server/api";
import { db } from "@/server/db";
import { getPassport } from "@/server/services/engagement";

export const GET = route({ auth: true }, async ({ user }) => ({ user: { id: user.id, name: user.name, handle: user.handle, email: user.email, role: user.role, premium: user.premium }, passport: await getPassport(user.id) }));

const body = z.object({ name: z.string().trim().min(2).max(80), countryCode: z.string().length(2).nullish(), city: z.string().trim().max(80).nullish() });
export const PATCH = route({ auth: true, body }, async ({ user, body }) => {
  await db.user.update({ where: { id: user.id }, data: { name: body.name, countryCode: body.countryCode || null, city: body.city || null } });
  return { ok: true };
});
