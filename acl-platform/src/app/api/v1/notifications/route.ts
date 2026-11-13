import { route, pageParams } from "@/server/api";
import { db } from "@/server/db";

export const GET = route({ auth: true }, async ({ user, req }) => {
  const { take, skip } = pageParams(req);
  const [items, unread] = await Promise.all([db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take, skip }), db.notification.count({ where: { userId: user.id, readAt: null } })]);
  return { items, unread };
});
