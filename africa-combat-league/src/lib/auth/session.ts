import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { isRoleKey, isStaff, type RoleKey } from "./roles";

export type SessionContext = {
  user: User | null;
  roles: RoleKey[];
  /** True once the session has passed two-factor (Supabase AAL2). */
  twoFactor: boolean;
};

/** Who is making this request? Cached per request. */
export const getSession = cache(async (): Promise<SessionContext> => {
  if (!isSupabaseConfigured) return { user: null, roles: [], twoFactor: false };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, roles: [], twoFactor: false };

  const [{ data: roleRows }, { data: aal }] = await Promise.all([
    supabase.from("user_roles").select("role_key").eq("user_id", user.id),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  const roles = (roleRows ?? []).map((row) => row.role_key).filter(isRoleKey);
  return { user, roles, twoFactor: aal?.currentLevel === "aal2" };
});

export async function requireUser(next = "/account"): Promise<SessionContext & { user: User }> {
  const session = await getSession();
  if (!session.user) redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  return session as SessionContext & { user: User };
}

/**
 * Gate for every admin page and admin server action.
 * Signed in + a staff role + two-factor. Pass `allowed` to restrict to
 * departments; super_admin always passes. The database enforces the same
 * rules again through row-level security.
 */
export async function requireAdmin(allowed?: RoleKey[], next = "/admin") {
  const session = await requireUser(next);
  if (!isStaff(session.roles)) notFound();
  if (!session.twoFactor) redirect(`/auth/mfa?next=${encodeURIComponent(next)}`);
  if (allowed && !session.roles.includes("super_admin") && !allowed.some((role) => session.roles.includes(role))) {
    notFound();
  }
  return session;
}

/** Only allow same-site relative redirects. */
export function safeNext(value: unknown, fallback = "/account"): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")
    ? value
    : fallback;
}
