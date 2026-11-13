import Link from "next/link";
import type { NavItem } from "@/lib/nav";
import type { Translate } from "@/i18n";
import { text, type SettingsMap } from "@/lib/settings";
import { whatsappLink } from "@/lib/contact";
import { DataSaverToggle } from "@/components/ui/data-saver-toggle";

type Props = { nav: NavItem[]; t: Translate; settings: SettingsMap };

export function SiteFooter({ nav, t, settings }: Props) {
  const name = text(settings, "brand.name");
  const phone = text(settings, "contact.phone");
  const whatsapp = text(settings, "contact.whatsapp");
  const email = text(settings, "contact.email");
  const legal = nav.find((item) => item.key === "legal");
  const columns = nav.filter((item) => item.key !== "legal" && item.children.length > 0);
  const singles = nav.filter((item) => item.key !== "legal" && item.children.length === 0);

  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="bamboo-rule rounded-none" aria-hidden="true" />
      <div className="container-page py-10">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div className="space-y-4">
            <p className="display text-display-md">{text(settings, "brand.tagline")}</p>
            <p className="text-ash">{text(settings, "brand.philosophy")}</p>
            <ul className="space-y-1.5 text-sm">
              {phone && (
                <li>
                  <span className="label mr-2 text-ash">{t("footer.call")}</span>
                  <a href={`tel:${phone}`} className="font-semibold underline-offset-4 hover:underline">
                    {phone}
                  </a>
                </li>
              )}
              {whatsapp && (
                <li>
                  <span className="label mr-2 text-ash">{t("footer.whatsapp")}</span>
                  <a
                    href={whatsappLink(whatsapp)}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="font-semibold underline-offset-4 hover:underline"
                  >
                    {phone || whatsapp}
                  </a>
                </li>
              )}
              {email && (
                <li>
                  <span className="label mr-2 text-ash">{t("footer.email")}</span>
                  <a href={`mailto:${email}`} className="font-semibold break-all underline-offset-4 hover:underline">
                    {email}
                  </a>
                </li>
              )}
            </ul>
            <div className="max-w-sm">
              <DataSaverToggle
                label={t("data_saver.label")}
                hint={t("data_saver.hint")}
                onText={t("data_saver.on")}
                offText={t("data_saver.off")}
              />
            </div>
          </div>

          <nav aria-label={t("nav.footer_label")} className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.key}>
                <Link href={column.path} className="label text-bone hover:text-ember-bright">
                  {column.label}
                </Link>
                <ul className="mt-3 space-y-2 text-sm text-ash">
                  {column.children.map((child) => (
                    <li key={child.key}>
                      <Link href={child.path} className="hover:text-bone">
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <p className="label text-bone">{t("nav.more")}</p>
              <ul className="mt-3 space-y-2 text-sm text-ash">
                {singles.map((item) => (
                  <li key={item.key}>
                    <Link href={item.path} className="hover:text-bone">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-line pt-6 text-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="display text-xl tracking-wide text-gold">{text(settings, "founder.footer_line")}</p>
            <p className="mt-1 text-ash">
              © {new Date().getFullYear()} {name}. {t("footer.rights")}{" "}
              {t("footer.based_in", { city: text(settings, "hq.city"), state: text(settings, "hq.state") })}
            </p>
          </div>
          {legal && (
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-ash">
              {legal.children.map((item) => (
                <li key={item.key}>
                  <Link href={item.path} className="underline-offset-4 hover:text-bone hover:underline">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
