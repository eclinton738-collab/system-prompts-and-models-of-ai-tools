import type { Metadata } from "next";
import Link from "next/link";
import { adminSections, canAccessSection } from "@/config/admin-nav";
import { getTranslator } from "@/i18n";
import { requireAdmin } from "@/lib/auth/session";
import { signOut } from "../(site)/auth/actions";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | ACL Admin" },
  robots: { index: false, follow: false },
};

// Never prerender or cache admin pages.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Signed in + staff role + two-factor, or this never renders.
  const [{ user, roles }, t] = await Promise.all([requireAdmin(), getTranslator()]);
  const sections = adminSections.filter((section) => canAccessSection(section, roles));

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="border-b border-line bg-surface lg:min-h-dvh lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <Link href="/admin" className="display text-2xl">
            <span className="border-b-4 border-ember">ACL</span> <span className="text-ash">Admin</span>
          </Link>
          <Link href="/" className="label text-ash hover:text-bone">
            {t("admin.view_site")}
          </Link>
        </div>
        <nav aria-label={t("admin.title")} className="flex gap-6 overflow-x-auto px-4 py-3 lg:block lg:space-y-5 lg:overflow-visible">
          <Link href="/admin" className="label block shrink-0 text-bone hover:text-ember-bright">
            {t("admin.dashboard")}
          </Link>
          {sections.map((section) => (
            <div key={section.key} className="shrink-0">
              <p className="label text-gold">{t(`admin.sections.${section.key}`)}</p>
              <ul className="mt-1.5 flex gap-4 lg:block lg:space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.key}>
                    <Link href={item.path} className="block py-1 text-sm font-semibold whitespace-nowrap text-ash hover:text-bone">
                      {t(`admin.items.${item.key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <div>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.email ?? user.phone}</p>
            <p className="label text-ash">{roles.map((role) => role.replace("_", " ")).join(" · ")}</p>
          </div>
          <form action={signOut}>
            <button type="submit" className="btn btn-ghost min-h-10 px-3 py-1 text-xs">
              {t("auth.sign_out")}
            </button>
          </form>
        </header>
        <main id="main" className="p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
