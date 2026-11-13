"use server";

import { revalidatePath } from "next/cache";
import { isRoleKey } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/session";
import { toE164 } from "@/lib/contact";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin server actions. Each one re-checks access with requireAdmin(), writes
 * with the signed-in user's own client (so row-level security applies), and is
 * recorded in audit_log by a database trigger.
 */
export type ActionState = { ok?: boolean; message?: string };

export async function saveSetting(_: ActionState, form: FormData): Promise<ActionState> {
  const { user } = await requireAdmin([], "/admin/settings"); // super_admin only
  const key = String(form.get("key") ?? "").trim();
  if (!/^[a-z0-9_]+(\.[a-z0-9_]+)+$/.test(key)) return { message: "failed" };

  let value: unknown;
  try {
    value = JSON.parse(String(form.get("value") ?? ""));
  } catch {
    return { message: "invalid_json" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .upsert({
      key,
      value,
      description: String(form.get("description") ?? "").trim() || null,
      is_public: form.get("is_public") === "on",
      updated_by: user.id,
    })
    .select("key");
  if (error || !data?.length) return { message: "failed" };

  // Settings feed every page (header, footer, metadata, share cards).
  revalidatePath("/", "layout");
  return { ok: true, message: "saved" };
}

export async function grantRole(_: ActionState, form: FormData): Promise<ActionState> {
  const { user } = await requireAdmin([], "/admin/users");
  const identifier = String(form.get("identifier") ?? "").trim();
  const role = form.get("role");
  if (!identifier || !isRoleKey(role)) return { message: "failed" };

  const supabase = await createClient();
  const lookup = supabase.from("profiles").select("id").limit(1);
  const { data: profiles } = identifier.includes("@")
    ? await lookup.eq("email", identifier.toLowerCase())
    : await lookup.in("phone", [toE164(identifier) ?? identifier, (toE164(identifier) ?? identifier).replace(/^\+/, "")]);
  const target = profiles?.[0];
  if (!target) return { message: "not_found" };

  const { error } = await supabase
    .from("user_roles")
    .upsert({ user_id: target.id, role_key: role, granted_by: user.id }, { onConflict: "user_id,role_key" });
  if (error) return { message: "failed" };
  revalidatePath("/admin/users");
  return { ok: true, message: "granted" };
}

export async function revokeRole(form: FormData): Promise<void> {
  const { user } = await requireAdmin([], "/admin/users");
  const userId = String(form.get("user_id") ?? "");
  const role = form.get("role");
  if (!userId || !isRoleKey(role)) return;
  // The founder cannot lock themselves out by accident.
  if (userId === user.id && role === "super_admin") return;

  const supabase = await createClient();
  await supabase.from("user_roles").delete().eq("user_id", userId).eq("role_key", role);
  revalidatePath("/admin/users");
}
