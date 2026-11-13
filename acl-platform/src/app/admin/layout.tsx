import Link from "next/link";
import { requirePermission } from "@/server/auth";
import { can } from "@/server/permissions";
import { ADMIN_NAV } from "@/server/admin/nav";
import { Logo } from "@/components/media";
import { ActionButton } from "@/components/client/ActionButton";
import { label } from "@/lib/format";

export const metadata = { title: { default: "ACL Admin", template: "%s | ACL Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePermission("admin.access", "/admin");
  const nav = ADMIN_NAV.filter((n) => can(user.role, n.permission));
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="border-b border-line bg-coal lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Link href="/admin" aria-label="ACL Admin"><Logo className="h-8 w-auto" /></Link>
          <span className="chip chip-gold">CMS</span>
        </div>
        <nav aria-label="Admin" className="overflow-x-auto px-2 pb-2 lg:overflow-visible lg:pb-6" style={{ scrollbarWidth: "none" }}>
          <ul className="flex min-w-max gap-1 lg:block lg:min-w-0 lg:space-y-0.5">
            {nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="display block whitespace-nowrap px-3 py-2 text-base tracking-wider text-bone/85 hover:bg-white/5 hover:text-white">{n.label}</Link>
                {n.sub && <ul className="hidden lg:block">{n.sub.map((s) => <li key={s.href}><Link href={s.href} className="block py-1 pl-7 pr-3 text-xs text-fog hover:text-bone">{s.label}</Link></li>)}</ul>}
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
          <p className="text-sm text-fog">Signed in as <span className="font-semibold text-bone">{user.name}</span> · {label(user.role)}</p>
          <div className="flex items-center gap-2"><Link href="/" className="btn btn-ghost btn-sm">View site</Link><ActionButton endpoint="/api/v1/auth/logout" label="Sign out" redirectTo="/" /></div>
        </header>
        <main id="main" className="px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
