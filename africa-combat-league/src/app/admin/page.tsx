import Link from "next/link";
import { adminSections, canAccessSection } from "@/config/admin-nav";
import { getTranslator } from "@/i18n";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminDashboard() {
  const [{ roles }, t] = await Promise.all([requireAdmin(), getTranslator()]);
  const sections = adminSections.filter((section) => canAccessSection(section, roles));

  return (
    <>
      <h1 className="display text-display-md">{t("admin.dashboard")}</h1>
      <p className="mt-1 text-ash">{t("admin.dashboard_lede")}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <section key={section.key} className="card p-5">
            <h2 className="display text-2xl text-gold">{t(`admin.sections.${section.key}`)}</h2>
            <ul className="mt-3 divide-y divide-line">
              {section.items.map((item) => (
                <li key={item.key}>
                  <Link href={item.path} className="flex items-center justify-between gap-3 py-2.5 font-semibold hover:text-ember-bright">
                    {t(`admin.items.${item.key}`)}
                    {!item.built && <span className="label text-ash">{t("common.coming_soon")}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
