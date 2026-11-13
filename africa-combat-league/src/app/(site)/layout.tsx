import { bottomNavKeys } from "@/config/sitemap";
import { getTranslator } from "@/i18n";
import { siteUrl } from "@/lib/env";
import { buildNav } from "@/lib/nav";
import { getSettings, record, text } from "@/lib/settings";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { DataSaverToggle } from "@/components/ui/data-saver-toggle";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, t] = await Promise.all([getSettings(), getTranslator()]);
  const nav = buildNav(t);
  const name = text(settings, "brand.name");

  const organization = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name,
    alternateName: text(settings, "brand.short_name"),
    slogan: text(settings, "brand.tagline"),
    url: siteUrl,
    sport: "Boxing",
    founder: { "@type": "Person", name: text(settings, "founder.name"), jobTitle: text(settings, "founder.title") },
    address: {
      "@type": "PostalAddress",
      addressLocality: text(settings, "hq.city"),
      addressRegion: text(settings, "hq.state"),
      addressCountry: "NG",
    },
    email: text(settings, "contact.email"),
    telephone: text(settings, "contact.phone"),
    sameAs: Object.values(record(settings, "social.links")).filter((link) => typeof link === "string"),
  };

  return (
    <>
      <a
        href="#main"
        className="btn btn-primary sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-50"
      >
        {t("nav.skip_to_content")}
      </a>
      <SiteHeader nav={nav} t={t} name={name} shortName={text(settings, "brand.short_name")} />
      <main id="main" className="min-h-[60dvh]">
        {children}
      </main>
      <SiteFooter nav={nav} t={t} settings={settings} />
      {/* Space so the fixed bottom nav never covers the footer. */}
      <div className="h-[calc(var(--spacing-bottomnav)+env(safe-area-inset-bottom))] bg-surface lg:hidden" aria-hidden="true" />
      <MobileNav
        items={nav}
        bottomKeys={bottomNavKeys}
        labels={{
          menu: t("nav.menu"),
          close: t("nav.close_menu"),
          nav: t("nav.mobile_label"),
          overview: t("nav.overview"),
          account: t("nav.account"),
          home: t("nav.home"),
        }}
      >
        <DataSaverToggle
          label={t("data_saver.label")}
          hint={t("data_saver.hint")}
          onText={t("data_saver.on")}
          offText={t("data_saver.off")}
        />
      </MobileNav>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, "\\u003c") }} />
    </>
  );
}
