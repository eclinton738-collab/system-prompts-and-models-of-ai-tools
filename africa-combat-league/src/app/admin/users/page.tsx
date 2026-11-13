import type { Metadata } from "next";
import en from "@/i18n/messages/en.json";
import { getTranslator } from "@/i18n";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { revokeRole } from "../actions";
import { GrantForm } from "./grant-form";

export const metadata: Metadata = { title: "Users and roles" };

export default async function UsersPage() {
  const { user } = await requireAdmin([], "/admin/users");
  const [t, supabase] = await Promise.all([getTranslator(), createClient()]);
  const [{ data: roles }, { data: grants }] = await Promise.all([
    supabase.from("roles").select("key, name").order("sort_order"),
    // Everyone holds "fan"; list only the roles that were granted on purpose.
    supabase.from("user_roles").select("user_id, role_key, granted_at").neq("role_key", "fan").order("granted_at"),
  ]);
  const ids = [...new Set((grants ?? []).map((grant) => grant.user_id))];
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, display_name, email, phone").in("id", ids)
    : { data: [] };
  const people = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const roleName = new Map((roles ?? []).map((role) => [role.key, role.name]));
  const labels = Object.fromEntries(Object.keys(en.admin.users).map((key) => [key, t(`admin.users.${key}`)]));

  return (
    <>
      <h1 className="display text-display-md">{t("admin.items.users")}</h1>
      <p className="mt-1 text-ash">{t("admin.users.lede")}</p>
      <div className="mt-8">
        <GrantForm roles={roles ?? []} labels={labels} />
      </div>

      <h2 className="display mt-10 mb-3 text-2xl">{t("admin.users.staff")}</h2>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="label border-b border-line text-ash">
            <tr>
              <th scope="col" className="px-4 py-3">{t("admin.users.user")}</th>
              <th scope="col" className="px-4 py-3">{t("admin.users.role")}</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">{t("admin.users.revoke")}</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(grants ?? []).length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-ash">{t("admin.users.none")}</td>
              </tr>
            )}
            {(grants ?? []).map((grant) => {
              const person = people.get(grant.user_id);
              const self = grant.user_id === user.id && grant.role_key === "super_admin";
              return (
                <tr key={`${grant.user_id}-${grant.role_key}`}>
                  <td className="px-4 py-3">
                    <span className="block font-semibold">{person?.display_name ?? person?.email ?? person?.phone ?? grant.user_id}</span>
                    {person?.display_name && <span className="block text-xs text-ash">{person.email ?? person.phone}</span>}
                  </td>
                  <td className="px-4 py-3 font-semibold">{roleName.get(grant.role_key) ?? grant.role_key}</td>
                  <td className="px-4 py-3 text-right">
                    {!self && (
                      <form action={revokeRole}>
                        <input type="hidden" name="user_id" value={grant.user_id} />
                        <input type="hidden" name="role" value={grant.role_key} />
                        <button type="submit" className="btn btn-ghost min-h-10 px-3 py-1 text-xs">
                          {t("admin.users.revoke")}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
