import { z } from "zod";
import { route, ApiError } from "@/server/api";
import { db } from "@/server/db";
import { createSession, verifyPassword } from "@/server/auth";
import { audit } from "@/server/audit";
import { rateLimit } from "@/server/rate-limit";

const body = z.object({ email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(1).max(200) });
// Constant work for unknown emails so response time does not reveal which accounts exist.
const DUMMY = "scrypt$00000000000000000000000000000000$" + "0".repeat(128);

export const POST = route({ body, limit: 10 }, async ({ body, req }) => {
  // Per-account throttle in addition to the per-client limit.
  if (!rateLimit(`login:${body.email}`, 8, 15 * 60_000).ok) throw new ApiError(429, "locked", "Too many attempts for this account. Try again in 15 minutes.");
  const user = await db.user.findUnique({ where: { email: body.email } });
  const valid = await verifyPassword(body.password, user?.passwordHash ?? DUMMY);
  if (!user || !valid || user.disabled) {
    await audit(user?.id ?? null, "login_failed", "user", user?.id);
    throw new ApiError(401, "invalid_credentials", "Email or password is incorrect.");
  }
  await createSession(user.id, req.headers.get("user-agent"));
  await audit(user.id, "login", "user", user.id);
  return { id: user.id };
});
