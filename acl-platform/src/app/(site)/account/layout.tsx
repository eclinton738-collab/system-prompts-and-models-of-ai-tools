import Link from "next/link";
import { requireUser } from "@/server/auth";
import { can } from "@/server/permissions";
import { ActionButton } from "@/components/client/ActionButton";

export const metadata = { robots: { index: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");
  const links = [["/account", "Passport"], ["/account/orders", "Tickets & orders"], ["/account/predictions", "Predictions"], ["/account/notifications", "Alerts"], ["/account/settings", "Settings"]];
  return (
    <div className="container-acl py-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <nav aria-label="Account"><ul className="flex flex-wrap gap-x-5 gap-y-2">{links.map(([h, l]) => <li key={h}><Link href={h} className="display text-lg tracking-wider text-fog hover:text-bone">{l}</Link></li>)}
          {can(user.role, "portal.fighter") && <li><Link href="/portal" className="display text-lg tracking-wider text-gold">Fighter portal</Link></li>}
          {can(user.role, "admin.access") && <li><Link href="/admin" className="display text-lg tracking-wider text-gold">Admin</Link></li>}
        </ul></nav>
        <ActionButton endpoint="/api/v1/auth/logout" label="Sign out" busyLabel="Signing out…" redirectTo="/" />
      </div>
      {children}
    </div>
  );
}
