"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "./api";

type NavItem = { href: string; label: string };
type Viewer = { name: string; unread: number; isStaff: boolean } | null;

type Quick = {
  fighters: { slug: string; firstName: string; lastName: string; nickname: string | null }[];
  events: { slug: string; name: string }[];
  fights: { slug: string; title: string }[];
  articles: { slug: string; title: string }[];
  videos: { slug: string; title: string }[];
  gyms: { slug: string; name: string }[];
  total: number;
};

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Quick | null>(null);
  const [loading, setLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setRes(null);
      return;
    }
    setLoading(true);
    const ctrl = { cancelled: false };
    const t = setTimeout(async () => {
      const r = await api<Quick>(`/api/v1/search?q=${encodeURIComponent(q)}&quick=1`, { redirectOn401: false });
      if (!ctrl.cancelled) {
        setRes(r.data ?? null);
        setLoading(false);
      }
    }, 220);
    return () => {
      ctrl.cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  const groups: [string, { href: string; label: string }[]][] = res
    ? [
        ["Fighters", res.fighters.map((f) => ({ href: `/fighters/${f.slug}`, label: `${f.firstName} ${f.nickname ? `“${f.nickname}” ` : ""}${f.lastName}` }))],
        ["Events", res.events.map((e) => ({ href: `/events/${e.slug}`, label: e.name }))],
        ["Fights", res.fights.map((f) => ({ href: `/fights/${f.slug}`, label: f.title }))],
        ["News", res.articles.map((a) => ({ href: `/news/${a.slug}`, label: a.title }))],
        ["Videos", res.videos.map((v) => ({ href: `/watch/${v.slug}`, label: v.title }))],
        ["Gyms", res.gyms.map((g) => ({ href: `/gyms/${g.slug}`, label: g.name }))],
      ]
    : [];

  return (
    <div role="dialog" aria-modal="true" aria-label="Search ACL" className="fixed inset-0 z-[70] overflow-y-auto bg-ink/97 backdrop-blur">
      <div className="container-acl py-4 sm:py-10">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) {
              router.push(`/search?q=${encodeURIComponent(q.trim())}`);
              onClose();
            }
          }}
          className="flex items-center gap-3 border-b-2 border-red pb-3"
        >
          <input ref={input} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search fighters, events, fights, news…" aria-label="Search" className="display min-w-0 flex-1 bg-transparent text-2xl uppercase outline-none placeholder:text-fog/60 sm:text-4xl" />
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Close</button>
        </form>
        <div aria-live="polite" className="mt-6">
          {loading && <p className="text-sm text-fog">Searching…</p>}
          {!loading && res && res.total === 0 && <p className="text-fog">No results for “{q}”. Try a fighter name, a city or an event.</p>}
          {!loading && !res && (
            <div className="text-sm text-fog">
              <p className="mb-3 uppercase tracking-widest">Popular</p>
              <div className="flex flex-wrap gap-2">
                {["Okoro", "State Wars", "Welterweight", "Aba", "Knockout", "Accra"].map((s) => (
                  <button key={s} type="button" onClick={() => setQ(s)} className="chip chip-outline min-h-9 px-3 hover:text-bone">{s}</button>
                ))}
              </div>
            </div>
          )}
          {!loading && res && res.total > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {groups.filter(([, items]) => items.length).map(([title, items]) => (
                <section key={title}>
                  <h3 className="eyebrow mb-2">{title}</h3>
                  <ul>
                    {items.map((it) => (
                      <li key={it.href}>
                        <Link href={it.href} onClick={onClose} className="block border-b border-line py-2.5 text-sm hover:text-gold">{it.label}</Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              <Link href={`/search?q=${encodeURIComponent(q)}`} onClick={onClose} className="btn btn-ghost btn-sm self-start sm:col-span-2 lg:col-span-3 lg:justify-self-start">See all results</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const Icon = ({ d, className = "h-6 w-6" }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d={d} />
  </svg>
);
const ICONS = {
  search: "M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z",
  menu: "M3 6h18M3 12h18M3 18h18",
  close: "M6 6l12 12M18 6L6 18",
  home: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  fights: "M7 4h4v7H7zM13 4h4v7h-4zM5 11h14l-1 9H6z",
  fighters: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6",
  watch: "M4 5h16v12H4zM10 9l5 2.5-5 2.5zM8 21h8",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6",
  bell: "M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 0 0 4 0",
};

export function SiteHeader({ nav, more, viewer, ticketsHref, logo }: { nav: NavItem[]; more: NavItem[]; viewer: Viewer; ticketsHref: string; logo: React.ReactNode }) {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);

  useEffect(() => {
    setMenu(false);
    setSearch(false);
  }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menu]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement))) {
        e.preventDefault();
        setSearch(true);
      }
      if (e.key === "Escape") setMenu(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-ink/95 backdrop-blur supports-[backdrop-filter]:bg-ink/85">
        <div className="container-acl flex h-14 items-center gap-3 lg:h-16">
          <Link href="/" aria-label="Africa Combat League — home" className="shrink-0">{logo}</Link>
          <nav aria-label="Main" className="ml-2 hidden min-w-0 flex-1 xl:block">
            <ul className="flex items-center">
              {nav.slice(1).map((n) => (
                <li key={n.href}>
                  <Link href={n.href} aria-current={isActive(pathname, n.href) ? "page" : undefined} className={`display block px-2 py-2 text-[0.98rem] tracking-wider transition-colors 2xl:px-3 2xl:text-lg ${isActive(pathname, n.href) ? "text-red" : "text-bone/85 hover:text-white"}`}>
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <button type="button" onClick={() => setSearch(true)} aria-label="Search" className="flex h-11 w-11 items-center justify-center text-bone/85 hover:text-white">
              <Icon d={ICONS.search} />
            </button>
            {viewer ? (
              <>
                <Link href="/notifications" aria-label={`Notifications${viewer.unread ? `, ${viewer.unread} unread` : ""}`} className="relative hidden h-11 w-11 items-center justify-center text-bone/85 hover:text-white sm:flex">
                  <Icon d={ICONS.bell} />
                  {viewer.unread > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red px-1 text-[0.6rem] font-bold">{viewer.unread > 9 ? "9+" : viewer.unread}</span>}
                </Link>
                <Link href="/account" className="hidden items-center gap-2 px-2 text-sm font-semibold hover:text-gold md:flex">
                  <Icon d={ICONS.user} className="h-5 w-5" /> <span className="max-w-28 truncate">{viewer.name.split(" ")[0]}</span>
                </Link>
              </>
            ) : (
              <>
                <Link href="/sign-in" className="hidden px-2 text-sm font-semibold uppercase tracking-widest text-bone/85 hover:text-white md:block">Sign in</Link>
                <Link href="/join" className="btn btn-ghost btn-sm hidden md:inline-flex">Join ACL</Link>
              </>
            )}
            <Link href={ticketsHref} className="btn btn-red btn-sm">Get tickets</Link>
            <button type="button" onClick={() => setMenu(true)} aria-label="Open menu" aria-expanded={menu} className="flex h-11 w-11 items-center justify-center xl:hidden">
              <Icon d={ICONS.menu} />
            </button>
          </div>
        </div>
      </header>

      {menu && (
        <div role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-[60] overflow-y-auto bg-ink">
          <div className="container-acl flex h-14 items-center justify-between">
            <Link href="/" aria-label="Home">{logo}</Link>
            <button type="button" onClick={() => setMenu(false)} aria-label="Close menu" className="flex h-11 w-11 items-center justify-center">
              <Icon d={ICONS.close} />
            </button>
          </div>
          <nav aria-label="Mobile" className="container-acl pb-28 pt-2">
            <ul>
              {nav.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className={`display flex items-center justify-between border-b border-line py-3.5 text-3xl ${isActive(pathname, n.href) ? "text-red" : ""}`}>
                    {n.label} <span aria-hidden className="text-fog">→</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="eyebrow mb-2 mt-8">More from ACL</p>
            <ul className="grid grid-cols-2 gap-x-4">
              {more.map((n) => (
                <li key={n.href}><Link href={n.href} className="block border-b border-line py-3 text-sm font-semibold text-fog hover:text-bone">{n.label}</Link></li>
              ))}
            </ul>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {viewer ? (
                <>
                  <Link href="/account" className="btn btn-white">My ACL</Link>
                  <Link href="/notifications" className="btn btn-ghost">Alerts{viewer.unread ? ` (${viewer.unread})` : ""}</Link>
                  {viewer.isStaff && <Link href="/admin" className="btn btn-ghost col-span-2">Admin dashboard</Link>}
                </>
              ) : (
                <>
                  <Link href="/sign-in" className="btn btn-ghost">Sign in</Link>
                  <Link href="/join" className="btn btn-white">Join ACL</Link>
                </>
              )}
              <Link href={ticketsHref} className="btn btn-red col-span-2">Get tickets</Link>
            </div>
          </nav>
        </div>
      )}
      {search && <SearchOverlay onClose={() => setSearch(false)} />}

      {/* Mobile bottom navigation */}
      <nav aria-label="Quick" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/97 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="grid grid-cols-5">
          {([
            ["/", "Home", ICONS.home],
            ["/fights", "Fights", ICONS.fights],
            ["/fighters", "Fighters", ICONS.fighters],
            ["/watch", "Watch", ICONS.watch],
            [viewer ? "/account" : "/join", viewer ? "My ACL" : "Join", ICONS.user],
          ] as const).map(([href, label, d]) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link href={href} aria-current={active ? "page" : undefined} className={`relative flex h-14 flex-col items-center justify-center gap-0.5 text-[0.62rem] font-semibold uppercase tracking-widest ${active ? "text-white" : "text-fog"}`}>
                  {active && <span aria-hidden className="absolute inset-x-5 top-0 h-0.5 bg-red" />}
                  <Icon d={d} className="h-5 w-5" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

export function CurrencySelect({ current, options }: { current: string | null; options: { code: string; name: string }[] }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-xs text-fog">
      <span className="uppercase tracking-widest">Show prices in</span>
      <select
        aria-label="Display currency"
        defaultValue={current ?? ""}
        onChange={async (e) => {
          await api("/api/v1/preferences/currency", { body: { code: e.target.value || null }, redirectOn401: false });
          router.refresh();
        }}
        className="min-h-9 border border-line bg-ink px-2 text-bone"
      >
        <option value="">Local price</option>
        {options.map((o) => <option key={o.code} value={o.code}>{o.code} — {o.name}</option>)}
      </select>
    </label>
  );
}
