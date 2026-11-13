import Link from "next/link";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import { flag, label, timeAgo } from "@/lib/format";

export const metadata = { title: "Applications" };
const PIPELINE = ["APPLICATION", "REVIEW", "SCOUTING", "TEST", "CONTRACT", "ACL_FIGHTER"] as const;

export default async function ApplicationsPage() {
  await requirePermission("applications.manage");
  const apps = await db.application.findMany({ orderBy: { updatedAt: "desc" } });
  const declined = apps.filter((a) => a.status === "DECLINED");
  return (
    <div>
      <h1 className="text-4xl sm:text-5xl">Scouting pipeline</h1>
      <p className="mb-6 mt-1 text-sm text-fog">{apps.length} applications. Open one to move it through the pipeline.</p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {PIPELINE.map((stage, i) => {
          const list = apps.filter((a) => a.status === stage);
          return (
            <section key={stage} aria-label={label(stage)} className="card min-h-32 p-3">
              <h2 className="mb-3 flex items-center justify-between text-lg"><span><span className="text-red">{i + 1}.</span> {label(stage)}</span><span className="chip">{list.length}</span></h2>
              <ul className="space-y-2">
                {list.map((a) => (
                  <li key={a.id}><Link href={`/admin/applications/${a.id}`} className="block border border-line bg-ink p-2.5 text-sm hover:border-gold"><span className="font-semibold">{a.fullName}</span><span className="block text-xs text-fog">{flag(a.countryCode)} {a.city} · {a.weightKg} kg · {a.wins}–{a.losses}–{a.draws}</span><span className="block text-[0.65rem] uppercase tracking-widest text-fog">{timeAgo(a.updatedAt)}</span></Link></li>
                ))}
                {!list.length && <li className="text-xs text-fog">Empty</li>}
              </ul>
            </section>
          );
        })}
      </div>
      {declined.length > 0 && <section className="mt-8"><h2 className="mb-2 text-2xl">Declined</h2><ul className="card divide-y divide-line text-sm">{declined.map((a) => <li key={a.id}><Link href={`/admin/applications/${a.id}`} className="block px-4 py-2.5 hover:text-gold">{a.fullName} · {a.city}</Link></li>)}</ul></section>}
    </div>
  );
}
