import Link from "next/link";
import { getCurrentUser } from "@/server/auth";
import { can } from "@/server/permissions";
import { db } from "@/server/db";
import { getMoney } from "@/server/services/money";
import { FOOTER_NAV, LEGAL_NAV, MAIN_NAV, MORE_NAV, SITE, SOCIALS } from "@/lib/site";
import { Logo } from "./media";
import { CurrencySelect, SiteHeader } from "./client/SiteChrome";
import { ApiForm } from "./client/ApiForm";
import { PageBeacon } from "./client/Beacon";

export async function Header() {
  const user = await getCurrentUser();
  const [unread, next] = await Promise.all([
    user ? db.notification.count({ where: { userId: user.id, readAt: null } }) : 0,
    db.event.findFirst({ where: { type: "FIGHT_NIGHT", status: { in: ["SCHEDULED", "LIVE"] }, ticketTypes: { some: { salesOpen: true } } }, orderBy: { startsAt: "asc" }, select: { slug: true } }),
  ]);
  return (
    <SiteHeader
      nav={[...MAIN_NAV]}
      more={[...MORE_NAV]}
      viewer={user ? { name: user.name, unread, isStaff: can(user.role, "admin.access") } : null}
      ticketsHref={next ? `/events/${next.slug}/tickets` : "/tickets"}
      logo={<Logo className="h-8 w-auto lg:h-9" />}
    />
  );
}

export async function Footer() {
  const [{ display, currencies }, settings] = await Promise.all([getMoney(), db.siteSetting.findMany()]);
  const s = Object.fromEntries(settings.map((x) => [x.key, x.value]));
  return (
    <footer className="mt-16 border-t border-line bg-coal pb-24 md:pb-0">
      <div className="container-acl grid gap-10 py-12 lg:grid-cols-[1.2fr_2fr]">
        <div>
          <Logo className="h-10 w-auto" />
          <p className="mt-4 max-w-sm text-sm text-fog">{SITE.tagline}. Fighters become stars, rivalries become stories and fight nights become events the continent stops for.</p>
          <div id="newsletter" className="mt-6 max-w-sm scroll-mt-24">
            <p className="eyebrow mb-2">Fight news in your inbox</p>
            <ApiForm endpoint="/api/v1/newsletter" fields={[{ name: "email", label: "Email address", type: "email", required: true, autoComplete: "email", placeholder: "you@example.com" }]} submitLabel="Subscribe" successMessage="You’re on the list." resetOnSuccess />
          </div>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {FOOTER_NAV.map((col) => (
            <div key={col.title}>
              <p className="display mb-3 text-lg tracking-widest text-gold">{col.title}</p>
              <ul className="space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.href}><Link href={l.href} className="text-fog hover:text-bone">{l.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="container-acl flex flex-col gap-4 py-5 text-xs text-fog lg:flex-row lg:items-center lg:justify-between">
          <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Social channels">
            {SOCIALS.map((name) => {
              const url = s[`${name.toLowerCase()}Url`];
              return (
                <li key={name}>
                  {url ? (
                    <a href={url} rel="noopener noreferrer" target="_blank" className="font-semibold uppercase tracking-widest hover:text-bone">{name}</a>
                  ) : (
                    <span className="font-semibold uppercase tracking-widest opacity-50" title="Channel link is set in Admin → Settings">{name}</span>
                  )}
                </li>
              );
            })}
          </ul>
          <CurrencySelect current={display} options={currencies.map((c) => ({ code: c.code, name: c.name }))} />
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_NAV.map((l) => (
              <li key={l.href}><Link href={l.href} className="hover:text-bone">{l.label}</Link></li>
            ))}
            <li>© {new Date().getFullYear()} {SITE.name}</li>
          </ul>
        </div>
        {s.demoMode === "true" && (
          <p className="border-t border-line bg-ink py-2 text-center text-[0.7rem] text-fog">
            Prototype running on demo data — fighters, results, sponsors and statistics shown are fictional.
          </p>
        )}
      </div>
      <PageBeacon />
    </footer>
  );
}
