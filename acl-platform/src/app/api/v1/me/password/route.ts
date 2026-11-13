import { z } from "zod";
import { route, ApiError } from "@/server/api";
import { db } from "@/server/db";
import { createSession, hashPassword, verifyPassword } from "@/server/auth";
import { audit } from "@/server/audit";

const body = z.object({ current: z.string().min(1).max(200), next: z.string().min(10, "Use at least 10 characters").max(200) });
export const POST = route({ auth: true, body, limit: 5 }, async ({ user, body, req }) => {
  const row = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(body.current, row.passwordHash))) throw new ApiError(422, "validation", "Current password is incorrect.", { current: "Incorrect password" });
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(body.next) } });
  // Revoke every session, then issue a fresh one for this device.
  await db.session.deleteMany({ where: { userId: user.id } });
  await createSession(user.id, req.headers.get("user-agent"));
  await audit(user.id, "password_change", "user", user.id);
  return { ok: true };
});
