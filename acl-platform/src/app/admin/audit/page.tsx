import Link from "next/link";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";

export const metadata = { title: "Audit log" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requirePermission("audit.view");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const PER = 50;
  const [rows, total] = await Promise.all([db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: PER, skip: (page - 1) * PER, include: { user: { select: { name: true, email: true } } } }), db.auditLog.count()]);
  return (
    <div>
      <h1 className="text-4xl sm:text-5xl">Audit log</h1>
      <p className="mb-5 mt-1 text-sm text-fog">{total.toLocaleString("en")} entries. Sign-ins, failed sign-ins, content changes, live commands, orders and broadcasts.</p>
      <div className="card overflow-x-auto">
        <table className="table-acl min-w-[720px]"><thead><tr><th>When (UTC)</th><th>Who</th><th>Action</th><th>Resource</th><th>Detail</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id}><td className="whitespace-nowrap text-fog">{r.createdAt.toISOString().slice(0, 19).replace("T", " ")}</td><td>{r.user?.name ?? "—"}</td><td className="font-semibold">{r.action}</td><td>{r.resource}</td><td className="text-bone/80">{r.detail ?? ""}</td></tr>)}</tbody>
        </table>
      </div>
      <nav aria-label="Pagination" className="mt-4 flex justify-between text-sm">{page > 1 ? <Link href={`/admin/audit?page=${page - 1}`} className="btn btn-ghost btn-sm">← Newer</Link> : <span />}{page * PER < total ? <Link href={`/admin/audit?page=${page + 1}`} className="btn btn-ghost btn-sm">Older →</Link> : <span />}</nav>
    </div>
  );
}
