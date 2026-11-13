import { z } from "zod";
import { route, notFound } from "@/server/api";
import { db } from "@/server/db";
import { can } from "@/server/permissions";

const body = z.object({ applicationId: z.string().min(1), body: z.string().trim().min(2).max(3000) });
export const POST = route({ auth: true, body, limit: 10 }, async ({ user, body }) => {
  const staff = can(user.role, "applications.manage");
  const app = await db.application.findFirst({ where: { id: body.applicationId, ...(staff ? {} : { userId: user.id }) } });
  if (!app) notFound("Application");
  await db.applicationMessage.create({ data: { applicationId: app.id, body: body.body, fromStaff: staff && app.userId !== user.id } });
  if (staff && app.userId !== user.id) await db.notification.create({ data: { userId: app.userId, type: "SYSTEM", title: "New message from ACL Scouting", body: body.body.slice(0, 120), url: "/portal" } });
  return { ok: true };
});
