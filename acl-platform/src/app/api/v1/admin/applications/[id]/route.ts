import { z } from "zod";
import { route, notFound } from "@/server/api";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { label } from "@/lib/format";

const body = z.object({ status: z.enum(["APPLICATION", "REVIEW", "SCOUTING", "TEST", "CONTRACT", "ACL_FIGHTER", "DECLINED"]).optional(), scoutNotes: z.string().max(5000).nullish(), documentsReceived: z.boolean().optional(), medicalCleared: z.boolean().optional(), contractStatus: z.string().trim().max(120).nullish() });
export const PATCH = route({ permission: "applications.manage", body }, async ({ user, body, params }) => {
  const app = await db.application.findUnique({ where: { id: params.id } });
  if (!app) notFound("Application");
  const { contractStatus, ...rest } = body;
  await db.application.update({ where: { id: app.id }, data: { ...rest, ...(contractStatus ? { contractStatus } : {}) } });
  if (body.status && body.status !== app.status) {
    await db.notification.create({ data: { userId: app.userId, type: "SYSTEM", title: `Application update: ${label(body.status)}`, body: body.status === "DECLINED" ? "Thank you for applying. See the fighter portal for details." : "Your application has moved to a new stage.", url: "/portal" } });
    await db.applicationMessage.create({ data: { applicationId: app.id, fromStaff: true, body: `Your application status is now: ${label(body.status)}.` } });
    // Signing a fighter upgrades the account so the fighter portal unlocks. The athlete profile is created and linked in Users.
    if (body.status === "ACL_FIGHTER") await db.user.updateMany({ where: { id: app.userId, role: "FAN" }, data: { role: "FIGHTER" } });
    await audit(user!.id, "application_status", "application", app.id, `${app.fullName}: ${app.status} → ${body.status}`);
  }
  return { ok: true };
});
