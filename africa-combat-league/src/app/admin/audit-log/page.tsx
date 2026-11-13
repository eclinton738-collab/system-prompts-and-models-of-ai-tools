import type { Metadata } from "next";
import { getTranslator } from "@/i18n";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Audit log" };

function changedFields(before: Record<string, unknown> | null, after: Record<string, unknown> | null): string {
  if (!before || !after) return "";
  return Object.keys(after)
    .filter((key) => key !== "updated_at" && JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .join(", ");
}

export default async function AuditLogPage() {
  await requireAdmin([], "/admin/audit-log");
  const [t, supabase] = await Promise.all([getTranslator(), createClient()]);
  const { data: rows } = await supabase
    .from("audit_log")
    .select("id, actor_id, action, table_name, record_id, old_data, new_data, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const ids = [...new Set((rows ?? []).map((row) => row.actor_id).filter(Boolean))];
  const { data: actors } = ids.length
    ? await supabase.from("profiles").select("id, display_name, email, phone").in("id", ids)
    : { data: [] };
  const names = new Map((actors ?? []).map((actor) => [actor.id, actor.display_name ?? actor.email ?? actor.phone]));
  const when = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" });

  return (
    <>
      <h1 className="display text-display-md">{t("admin.items.audit_log")}</h1>
      <p className="mt-1 text-ash">{t("admin.audit.lede")}</p>
      <div className="card mt-8 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="label border-b border-line text-ash">
            <tr>
              <th scope="col" className="px-4 py-3">{t("admin.audit.when")}</th>
              <th scope="col" className="px-4 py-3">{t("admin.audit.actor")}</th>
              <th scope="col" className="px-4 py-3">{t("admin.audit.action")}</th>
              <th scope="col" className="px-4 py-3">{t("admin.audit.target")}</th>
              <th scope="col" className="px-4 py-3">{t("admin.audit.change")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(rows ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-ash">{t("admin.audit.empty")}</td>
              </tr>
            )}
            {(rows ?? []).map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 whitespace-nowrap text-ash">{when.format(new Date(row.created_at))}</td>
                <td className="px-4 py-3 font-semibold">{names.get(row.actor_id) ?? row.actor_id ?? "—"}</td>
                <td className="px-4 py-3"><span className="label border border-line px-2 py-1">{row.action}</span></td>
                <td className="px-4 py-3 font-mono text-xs">
                  {row.table_name}
                  {row.record_id ? ` / ${row.record_id}` : ""}
                </td>
                <td className="px-4 py-3 text-xs text-ash">{changedFields(row.old_data, row.new_data)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
