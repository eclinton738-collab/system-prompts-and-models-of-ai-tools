import Link from "next/link";
import type { NavItem } from "@/lib/nav";
import type { Translate } from "@/i18n";
import { DesktopNav } from "./desktop-nav";
import { Logo } from "./logo";

type Props = { nav: NavItem[]; t: Translate; name: string; shortName: string };

export function SiteHeader({ nav, t, name, shortName }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/95 backdrop-blur-sm">
      <div className="container-page flex h-header items-center justify-between gap-4">
        <Logo name={name} shortName={shortName} />
        <DesktopNav
          items={nav}
          moreLabel={t("nav.more")}
          overviewLabel={t("nav.overview")}
          ariaLabel={t("nav.main_label")}
        />
        <Link href="/account" className="btn btn-ghost min-h-10 px-3 py-1 text-xs">
          {t("nav.account")}
        </Link>
      </div>
    </header>
  );
}
