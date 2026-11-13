import { route } from "@/server/api";
import { db } from "@/server/db";

export const POST = route({ auth: true }, async ({ user }) => {
  const r = await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  return { marked: r.count };
});
