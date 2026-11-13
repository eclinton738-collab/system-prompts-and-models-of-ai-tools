import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/server/auth";
import { can } from "@/server/permissions";
import { RESOURCES } from "@/server/admin/resources";
import { buildForm } from "@/server/admin/form";
import { ApiForm } from "@/components/client/ApiForm";

type Props = { params: Promise<{ resource: string }>; searchParams: Promise<Record<string, string | undefined>> };
export async function generateMetadata({ params }: Props) {
  const r = RESOURCES[(await params).resource];
  return { title: r ? `New ${r.singular}` : "Admin" };
}

export default async function AdminNewPage({ params, searchParams }: Props) {
  const [{ resource }, sp] = await Promise.all([params, searchParams]);
  const r = RESOURCES[resource];
  if (!r || r.noCreate) notFound();
  const user = await requirePermission("admin.access");
  if (!can(user.role, r.permission)) redirect("/admin");
  const { fields, initial } = await buildForm(r, null, { ...sp, ...(r.key === "news" ? { authorId: user.id } : {}) });
  return (
    <div className="max-w-4xl">
      <p className="mb-2 text-xs uppercase tracking-widest text-fog"><Link href={`/admin/${r.key}`} className="hover:text-gold">{r.label}</Link> / New</p>
      <h1 className="mb-6 text-4xl sm:text-5xl">New {r.singular}</h1>
      <div className="card p-5 sm:p-6"><ApiForm endpoint={`/api/v1/admin/${r.key}`} fields={fields} initial={initial} submitLabel={`Create ${r.singular}`} successMessage="Created." redirectFromData={`/admin/${r.key}/{id}?created=1`} /></div>
    </div>
  );
}
