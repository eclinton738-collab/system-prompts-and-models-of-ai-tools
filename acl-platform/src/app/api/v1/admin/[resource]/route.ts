import { z } from "zod";
import { route } from "@/server/api";
import { getResource, saveRow } from "@/server/admin/engine";

const body = z.record(z.unknown());
export const POST = route({ permission: "admin.access", body, limit: 60 }, async ({ user, body, params }) => {
  const r = getResource(params.resource, user!.role);
  const row = await saveRow(r, null, body, user!);
  return { id: row.id };
});
