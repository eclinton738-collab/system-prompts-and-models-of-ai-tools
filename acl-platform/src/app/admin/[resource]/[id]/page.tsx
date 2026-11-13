import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import { can } from "@/server/permissions";
import { RESOURCES } from "@/server/admin/resources";
import { getRow } from "@/server/admin/engine";
import { buildForm } from "@/server/admin/form";
import { ApiForm } from "@/components/client/ApiForm";
import { ActionButton } from "@/components/client/ActionButton";
import { label } from "@/lib/format";

type Props = { params: Promise<{ resource: string; id: string }>; searchParams: Promise<{ created?: string }> };
export async function generateMetadata({ params }: Props) {
  const r = RESOURCES[(await params).resource];
  return { title: r ? `Edit ${r.singular}` : "Admin" };
}

export default async function AdminEditPage({ params, searchParams }: Props) {
  const [{ resource, id }, sp] = await Promise.all([params, searchParams]);
  const r = RESOURCES[resource];
  if (!r) notFound();
  const user = await requirePermission("admin.access");
  if (!can(user.role, r.permission)) redirect("/admin");
  const row = await getRow(r, decodeURIComponent(id));
  if (!row) notFound();
  const { fields, initial } = await buildForm(r, row);
  const path = r.publicPath?.(row);
  // Event management: the card is built here by adding fights from the fighter database.
  const fights = r.key === "events" ? await db.fight.findMany({ where: { eventId: String(row.id) }, orderBy: { order: "desc" }, include: { fighterA: true, fighterB: true, division: true } }) : [];
  return (
    <div className="max-w-4xl">
      <p className="mb-2 text-xs uppercase tracking-widest text-fog"><Link href={`/admin/${r.key}`} className="hover:text-gold">{r.label}</Link> / Edit</p>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-3xl sm:text-5xl">{r.title(row)}</h1>
        <div className="flex flex-wrap gap-2">
          {path && <Link href={path} className="btn btn-ghost btn-sm">View on site ↗</Link>}
          {r.key === "events" && can(user.role, "live.manage") && <Link href={`/admin/live?event=${row.id}`} className="btn btn-ghost btn-sm">Live console</Link>}
        </div>
      </div>
      {sp.created && <p role="status" className="mb-4 border border-win/50 bg-win/10 p-3 text-sm font-semibold text-win">Created. You can keep editing below.</p>}
      <div className="card p-5 sm:p-6"><ApiForm endpoint={`/api/v1/admin/${r.key}/${encodeURIComponent(id)}`} method="PATCH" fields={fields} initial={initial} submitLabel="Save changes" successMessage="Saved." refresh /></div>

      {r.key === "events" && row.type === "FIGHT_NIGHT" && (
        <section className="mt-8" aria-labelledby="card">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <h2 id="card" className="text-3xl">Fight card</h2>
            <div className="flex flex-wrap gap-2">{(["MAIN_EVENT", "CO_MAIN", "UNDERCARD"] as const).map((p) => <Link key={p} href={`/admin/fights/new?eventId=${row.id}&position=${p}&order=${p === "MAIN_EVENT" ? fights.length + 1 : 1}`} className="btn btn-ghost btn-sm">+ {label(p)}</Link>)}</div>
          </div>
          {fights.length ? (
            <ul className="card divide-y divide-line">{fights.map((f) => <li key={f.id}><Link href={`/admin/fights/${f.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-white/5"><span><span className="chip mr-2">{label(f.position)}</span><span className="font-semibold">{f.fighterA.lastName} vs {f.fighterB.lastName}</span> · {f.division.name} · {f.rounds} rds{f.isTitleFight ? " · Title" : ""}</span><span className="text-xs uppercase tracking-widest text-fog">{f.status} · Edit</span></Link></li>)}</ul>
          ) : <p className="card p-4 text-sm text-fog">No fights yet. Add the main event, co-main and undercard using the buttons above.</p>}
          <p className="mt-3 text-xs text-fog">Ticket categories for this event are managed under <Link href="/admin/tickets" className="text-gold underline">Tickets</Link>.</p>
        </section>
      )}

      {!r.noDelete && (
        <section className="mt-10 border-t border-line pt-6" aria-label="Danger zone">
          <ActionButton endpoint={`/api/v1/admin/${r.key}/${encodeURIComponent(id)}`} method="DELETE" label={`Delete ${r.singular}`} busyLabel="Deleting…" confirm={`Delete this ${r.singular}? This cannot be undone.`} redirectTo={`/admin/${r.key}`} className="btn btn-sm border border-red/60 text-red hover:bg-red/10" />
        </section>
      )}
    </div>
  );
}
