import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/server/auth";
import { can } from "@/server/permissions";
import { RESOURCES } from "@/server/admin/resources";
import { cell, listRows } from "@/server/admin/engine";
import { EmptyState } from "@/components/ui";

type Props = { params: Promise<{ resource: string }>; searchParams: Promise<{ q?: string; page?: string }> };

export async function generateMetadata({ params }: Props) {
  return { title: RESOURCES[(await params).resource]?.label ?? "Admin" };
}

export default async function AdminListPage({ params, searchParams }: Props) {
  const [{ resource }, sp] = await Promise.all([params, searchParams]);
  const r = RESOURCES[resource];
  if (!r) notFound();
  const user = await requirePermission("admin.access");
  if (!can(user.role, r.permission)) redirect("/admin");
  const { rows, total, page, pages } = await listRows(r, { q: sp.q, page: Number(sp.page) || 1 });
  const idField = r.idField ?? "id";
  const qs = (p: number) => `/admin/${r.key}?${new URLSearchParams({ ...(sp.q && { q: sp.q }), page: String(p) })}`;
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-4xl sm:text-5xl">{r.label}</h1><p className="text-sm text-fog">{total} {total === 1 ? "record" : "records"}</p></div>
        {!r.noCreate && <Link href={`/admin/${r.key}/new`} className="btn btn-red">New {r.singular}</Link>}
      </div>
      {r.search && (
        <form className="mb-4 flex max-w-md gap-2" role="search"><label htmlFor="aq" className="sr-only">Search {r.label}</label><input id="aq" name="q" type="search" defaultValue={sp.q} placeholder={`Search ${r.label.toLowerCase()}`} className="field" /><button className="btn btn-ghost" type="submit">Search</button></form>
      )}
      {rows.length ? (
        <div className="card overflow-x-auto">
          <table className="table-acl min-w-[640px]">
            <thead><tr>{r.columns.map(([, l]) => <th key={l}>{l}</th>)}<th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row[idField])}>
                  {r.columns.map(([path], i) => <td key={path} className={i === 0 ? "font-semibold" : "text-bone/80"}>{i === 0 ? <Link href={`/admin/${r.key}/${row[idField]}`} className="hover:text-gold">{cell(r, row, path)}</Link> : <span className="line-clamp-1 max-w-64">{cell(r, row, path)}</span>}</td>)}
                  <td className="text-right"><Link href={`/admin/${r.key}/${row[idField]}`} className="text-xs font-semibold uppercase tracking-widest text-gold">Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title={sp.q ? "No matches" : `No ${r.label.toLowerCase()} yet`} body={sp.q ? "Try a different search." : undefined} action={r.noCreate ? undefined : { href: `/admin/${r.key}/new`, label: `Create the first ${r.singular}` }} />
      )}
      {pages > 1 && <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">{page > 1 ? <Link href={qs(page - 1)} className="btn btn-ghost btn-sm">← Previous</Link> : <span />}<span className="text-fog">Page {page} of {pages}</span>{page < pages ? <Link href={qs(page + 1)} className="btn btn-ghost btn-sm">Next →</Link> : <span />}</nav>}
    </div>
  );
}
