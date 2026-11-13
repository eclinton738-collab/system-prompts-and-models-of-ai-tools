import { z } from "zod";
import { route } from "@/server/api";
import { deleteRow, getResource, saveRow } from "@/server/admin/engine";

const body = z.record(z.unknown());
export const PATCH = route({ permission: "admin.access", body, limit: 60 }, async ({ user, body, params }) => {
  const r = getResource(params.resource, user!.role);
  const row = await saveRow(r, params.id, body, user!);
  return { id: row.id };
});
export const DELETE = route({ permission: "admin.access", limit: 30 }, async ({ user, params }) => {
  await deleteRow(getResource(params.resource, user!.role), params.id, user!);
  return { ok: true };
});
