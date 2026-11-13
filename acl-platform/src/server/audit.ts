import { db } from "./db";

export async function audit(userId: string | null, action: string, resource: string, resourceId?: string | null, detail?: string) {
  await db.auditLog.create({ data: { userId, action, resource, resourceId: resourceId ?? null, detail: detail?.slice(0, 2000) } }).catch(() => {});
}
