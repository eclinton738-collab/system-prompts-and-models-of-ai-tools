"use client";

import * as Popover from "@radix-ui/react-popover";
import {
  Armchair, Bell, CalendarDays, Check, ChevronsUpDown, CreditCard, FileBarChart, LayoutDashboard, Lock, MapPin, Megaphone, Menu,
  ScanLine, Search, Settings, ShieldAlert, Store, Ticket, TrendingUp, Users, WifiOff, X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { date, dateTime, initials } from "@/lib/format";
import { can, NAV, navFor, ROLE_LABELS } from "@/lib/permissions";
import { useOps } from "../ops-provider";
import { Badge, Button, EmptyState, severityTone } from "../ui";
import { useUi } from "../ui-context";
import { Logo, LogoMark } from "./logo";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = { LayoutDashboard, Ticket, TrendingUp, ScanLine, Users, Armchair, CreditCard, Store, Megaphone, FileBarChart, Settings };
const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

export function StatusBadge() {
  const { s } = useOps();
  const st = s.event.status;
  if (st === "LIVE") return <span className="slash inline-flex items-center gap-1.5 bg-acl px-3 py-0.5 font-display text-xs font-bold uppercase tracking-[0.2em] text-white"><span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-white" />Live</span>;
  return <Badge tone={st === "ON_SALE" ? "ok" : st === "ENDED" ? "neutral" : "warn"}>{st.replace("_", " ")}</Badge>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { s, online } = useOps();
  const path = usePathname();
  const nav = navFor(s.permissions);
  const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [path]);
  const current = NAV.find((n) => isActive(path, n.href));
  const allowed = !current || can(s.permissions, ...current.anyOf);

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Sidebar: full ≥xl, icon rail on tablet, hidden on mobile */}
      <aside className="no-print hidden w-[72px] shrink-0 flex-col border-r border-ink-600 bg-ink-900 md:flex xl:w-[252px]">
        <Link href={nav[0]?.href ?? "/"} className="flex h-16 items-center justify-center border-b border-ink-600 px-4 xl:justify-start" aria-label="ACL Event OS home">
          <LogoMark className="xl:hidden" /><Logo className="hidden xl:flex" />
        </Link>
        <div className="hidden px-5 pb-1 pt-4 xl:block"><span className="eyebrow">Event OS</span></div>
        <nav aria-label="Primary" className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2 xl:px-3">
          {nav.map((n) => { const Icon = ICONS[n.icon]; const active = isActive(path, n.href); return (
            <Link key={n.href} href={n.href} title={n.label} aria-current={active ? "page" : undefined}
              className={cn("group relative flex h-10 items-center justify-center gap-3 rounded px-3 text-sm font-medium transition xl:justify-start", active ? "bg-acl/[0.14] text-fg" : "text-fg-muted hover:bg-white/5 hover:text-fg")}>
              {active && <span className="absolute inset-y-1.5 left-0 w-[3px] bg-acl" aria-hidden />}
              <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-acl-glow")} />
              <span className="hidden truncate xl:inline">{n.label}</span>
            </Link>
          ); })}
        </nav>
        <div className="hidden border-t border-ink-600 px-5 py-3 xl:block">
          <p className="font-display text-[10px] font-semibold uppercase leading-relaxed tracking-[0.22em] text-fg-dim">Built by fighters<br />for fighters.</p>
        </div>
        <div className="border-t border-ink-600 p-2 xl:p-3"><ProfileMenu placement="sidebar" /></div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        {!online && <div role="alert" className="flex items-center justify-center gap-2 bg-warn px-4 py-1.5 text-xs font-semibold text-ink-950"><WifiOff className="h-3.5 w-3.5" />Connection lost — showing the last data received. Scans and sales will not go through until it returns.</div>}
        <main className="min-w-0 flex-1 overflow-y-auto px-4 pb-24 pt-5 md:px-6 md:pb-10 2xl:px-8">
          <div className="mx-auto w-full max-w-[1680px]">
            {allowed ? children : (
              <div className="panel mx-auto mt-16 max-w-lg">
                <EmptyState icon={Lock} title="Restricted area" body={`${ROLE_LABELS[s.currentUser.role]} accounts do not have access to ${current?.label}. Ask a Super Admin if you need it.`}
                  action={nav[0] && <Link href={nav[0].href} className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-acl-glow hover:underline">Go to {nav[0].label}</Link>} />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav aria-label="Primary mobile" className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-ink-500 bg-ink-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {nav.slice(0, 4).map((n) => { const Icon = ICONS[n.icon]; const active = isActive(path, n.href); return (
          <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={cn("flex h-14 flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wide", active ? "text-acl-glow" : "text-fg-muted")}>
            <Icon className="h-5 w-5" /><span className="max-w-full truncate px-1">{n.label.split(" ")[0]}</span>
          </Link>
        ); })}
        <button type="button" onClick={() => setMore(true)} aria-expanded={more} className="flex h-14 flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-fg-muted"><Menu className="h-5 w-5" />More</button>
      </nav>
      {more && (
        <div className="fixed inset-0 z-50 flex flex-col bg-ink-950/98 md:hidden" role="dialog" aria-label="All sections">
          <div className="flex h-16 items-center justify-between border-b border-ink-600 px-4"><Logo compact /><Button variant="ghost" size="icon" aria-label="Close menu" onClick={() => setMore(false)}><X className="h-5 w-5" /></Button></div>
          <div className="grid flex-1 grid-cols-2 content-start gap-2 overflow-y-auto p-4">
            {nav.map((n) => { const Icon = ICONS[n.icon]; return <Link key={n.href} href={n.href} className={cn("flex items-center gap-3 border p-4 text-sm font-medium", isActive(path, n.href) ? "border-acl bg-acl/10" : "border-ink-600 bg-ink-850")}><Icon className="h-5 w-5 text-fg-muted" />{n.label}</Link>; })}
          </div>
          <div className="border-t border-ink-600 p-4"><ProfileMenu placement="sidebar" forceFull /></div>
        </div>
      )}
    </div>
  );
}

function Header() {
  const { s, can: allowed } = useOps();
  const e = s.event;
  return (
    <header className="no-print flex h-16 shrink-0 items-center gap-3 border-b border-ink-600 bg-ink-900/80 px-4 backdrop-blur md:px-6">
      <LogoMark className="h-8 w-8 md:hidden" />
      <div className="min-w-0 flex-1 lg:flex-none">
        <div className="flex items-center gap-2.5">
          <span className="h-display truncate text-lg tracking-[0.06em] sm:text-xl">{e.name}</span>
          <StatusBadge />
        </div>
        <div className="mt-0.5 hidden items-center gap-3 text-xs text-fg-muted sm:flex">
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-fg-dim" />{date(e.doorsOpenAt)}</span>
          <span className="inline-flex items-center gap-1 truncate"><MapPin className="h-3.5 w-3.5 text-fg-dim" />{e.venue} · {e.location}</span>
          <span className="hidden items-center gap-1 lg:inline-flex"><Users className="h-3.5 w-3.5 text-fg-dim" />{e.capacity.toLocaleString()} capacity</span>
        </div>
      </div>
      <div className="hidden flex-1 justify-center lg:flex"><GlobalSearch /></div>
      <div className="flex items-center gap-1">
        <div className="lg:hidden"><GlobalSearch compact /></div>
        <Notifications />
        {allowed("settings.manage") && <Link href="/settings" aria-label="Event settings" title="Event settings" className="hidden h-9 w-9 items-center justify-center rounded text-fg-muted transition hover:bg-white/5 hover:text-fg sm:flex"><Settings className="h-[18px] w-[18px]" /></Link>}
        <div className="hidden md:block"><ProfileMenu placement="header" /></div>
      </div>
    </header>
  );
}

function GlobalSearch({ compact }: { compact?: boolean }) {
  const { s, ix, can: allowed } = useOps();
  const { openTicket } = useUi();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (compact) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) { e.preventDefault(); input.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [compact]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2 || !allowed("attendees.view")) return [];
    const digits = needle.replace(/\D/g, "");
    return s.tickets.filter((t) => {
      const a = ix.attendee.get(t.attendeeId)!; const p = ix.payment.get(t.paymentId)!;
      return t.id.toLowerCase().includes(needle) || a.name.toLowerCase().includes(needle) || a.email.includes(needle) || p.id.toLowerCase().includes(needle) || p.reference.toLowerCase().includes(needle) || (digits.length >= 4 && a.phone.replace(/\D/g, "").includes(digits));
    }).slice(0, 7);
  }, [q, s.tickets, ix, allowed]);
  useEffect(() => setCursor(0), [q]);
  const pick = (id: string) => { openTicket(id); setOpen(false); setQ(""); input.current?.blur(); };

  const field = (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-dim" />
      <input ref={input} type="search" role="combobox" aria-expanded={open && q.length >= 2} aria-controls="global-search-results" aria-label="Search tickets, attendees and payments"
        className="input h-9 pl-9 pr-9" placeholder="Search ticket ID, name, phone, reference…" value={q} autoFocus={compact}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
          if (e.key === "Enter" && results[cursor]) pick(results[cursor].id);
          else if (e.key === "Enter" && q.trim()) { router.push(`/attendees?q=${encodeURIComponent(q.trim())}`); setOpen(false); }
          if (e.key === "Escape") { setOpen(false); input.current?.blur(); }
        }} />
      {!compact && <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 border border-ink-500 px-1.5 font-mono text-[10px] text-fg-dim">/</kbd>}
      {open && q.trim().length >= 2 && (
        <ul id="global-search-results" role="listbox" className="panel absolute inset-x-0 top-full z-50 mt-1 max-h-[60vh] overflow-y-auto">
          {results.length === 0 && <li className="p-4 text-center text-sm text-fg-dim">{allowed("attendees.view") ? `Nothing matches “${q.trim()}”.` : "Your role cannot search attendees."}</li>}
          {results.map((t, i) => { const a = ix.attendee.get(t.attendeeId)!; return (
            <li key={t.id} role="option" aria-selected={i === cursor}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(t.id)} onMouseEnter={() => setCursor(i)} className={cn("flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm", i === cursor && "bg-white/[0.06]")}>
                <span className="min-w-0"><span className="ticket-id block">{t.id}</span><span className="block truncate text-xs text-fg-dim">{a.name} · {a.phone}</span></span>
                <span className="shrink-0 text-xs text-fg-muted">{ix.type.get(t.typeId)!.name}</span>
              </button>
            </li>
          ); })}
        </ul>
      )}
    </div>
  );
  if (!compact) return <div className="w-full max-w-md">{field}</div>;
  return (
    <Popover.Root>
      <Popover.Trigger asChild><Button variant="ghost" size="icon" aria-label="Search"><Search className="h-[18px] w-[18px]" /></Button></Popover.Trigger>
      <Popover.Portal><Popover.Content align="end" sideOffset={10} className="z-50 w-[min(92vw,420px)] border border-ink-500 bg-ink-850 p-2 shadow-2xl">{field}</Popover.Content></Popover.Portal>
    </Popover.Root>
  );
}

function Notifications() {
  const { s, call } = useOps();
  const { openTicket } = useUi();
  const [open, setOpen] = useState(false);
  const unread = s.notifications.filter((n) => !n.read);
  const critical = unread.some((n) => n.severity === "CRITICAL");
  // Security alerts are raised to the operator the moment they arrive, wherever they are in the app.
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!seen.current) { seen.current = new Set(s.notifications.map((n) => n.id)); return; }
    for (const n of s.notifications) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      if (n.severity === "CRITICAL") toast.error(n.title, { description: n.body, duration: 8000 });
    }
  }, [s.notifications]);
  // Security first, then newest.
  const sorted = useMemo(() => [...s.notifications].sort((a, b) => Number(b.severity === "CRITICAL" && !b.read) - Number(a.severity === "CRITICAL" && !a.read) || b.at.localeCompare(a.at)).slice(0, 40), [s.notifications]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Notifications, ${unread.length} unread`} className="relative">
          <Bell className="h-[18px] w-[18px]" />
          {unread.length > 0 && <span className={cn("absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums text-white", critical ? "animate-pulse-dot bg-danger" : "bg-info")}>{unread.length}</span>}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={10} className="z-50 flex max-h-[min(80dvh,620px)] w-[min(94vw,400px)] animate-rise flex-col border border-ink-500 bg-ink-850 shadow-2xl focus:outline-none">
          <div className="flex items-center justify-between border-b border-ink-600 px-4 py-3">
            <h2 className="h-display text-base tracking-[0.14em]">Notifications</h2>
            <Button variant="ghost" size="sm" disabled={unread.length === 0} onClick={() => call("notifications.read", {})}><Check className="h-3.5 w-3.5" />Mark all read</Button>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {sorted.length === 0 && <li><EmptyState icon={Bell} title="All quiet" body="New sales, payments and security alerts appear here." /></li>}
            {sorted.map((n) => (
              <li key={n.id} className={cn("border-b border-ink-700", n.severity === "CRITICAL" && !n.read && "bg-danger/[0.09]")}>
                <button type="button" className="flex w-full gap-3 px-4 py-3 text-left hover:bg-white/[0.04]" onClick={() => { if (!n.read) call("notifications.read", { id: n.id }); if (n.ticketId) { openTicket(n.ticketId); setOpen(false); } }}>
                  <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border", n.severity === "CRITICAL" ? "border-danger/60 bg-danger/15 text-danger" : n.severity === "WARNING" ? "border-warn/50 bg-warn/10 text-warn" : "border-ink-500 text-fg-muted")}>
                    {n.kind === "SECURITY" ? <ShieldAlert className="h-3.5 w-3.5" /> : n.kind === "SALE" ? <Ticket className="h-3.5 w-3.5" /> : n.kind === "PAYMENT" || n.kind === "REFUND" ? <CreditCard className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2"><span className={cn("truncate text-sm font-semibold", n.read ? "text-fg-muted" : "text-fg")}>{n.title}</span>{n.severity !== "INFO" && <Badge tone={severityTone(n.severity)}>{n.severity === "CRITICAL" ? "Security" : "Warning"}</Badge>}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-fg-muted">{n.body}</span>
                    <span className="mt-1 block text-[11px] tabular-nums text-fg-dim">{dateTime(n.at)}</span>
                  </span>
                  {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-acl" aria-label="Unread" />}
                </button>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ProfileMenu({ placement, forceFull }: { placement: "sidebar" | "header"; forceFull?: boolean }) {
  const { s, switchUser } = useOps();
  const router = useRouter();
  const me = s.currentUser;
  const [open, setOpen] = useState(false);
  // One demo login per role.
  const logins = s.users.filter((u, i, all) => all.findIndex((x) => x.role === u.role) === i);
  const avatar = <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-gradient-to-br from-acl to-acl-700 font-display text-sm font-bold text-white">{initials(me.name)}</span>;
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        {placement === "header" ? (
          <button type="button" aria-label={`Account: ${me.name}`} className="ml-1 flex items-center gap-2 rounded p-1 hover:bg-white/5">{avatar}</button>
        ) : (
          <button type="button" className="flex w-full items-center justify-center gap-3 rounded p-1.5 text-left hover:bg-white/5 xl:justify-start">
            {avatar}
            <span className={cn("min-w-0 flex-1", forceFull ? "block" : "hidden xl:block")}><span className="block truncate text-sm font-semibold">{me.name}</span><span className="block truncate text-xs text-fg-dim">{me.title}</span></span>
            <ChevronsUpDown className={cn("h-4 w-4 shrink-0 text-fg-dim", forceFull ? "block" : "hidden xl:block")} />
          </button>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side={placement === "sidebar" ? "top" : "bottom"} align={placement === "sidebar" ? "start" : "end"} sideOffset={8} className="z-[60] w-72 animate-rise border border-ink-500 bg-ink-850 shadow-2xl focus:outline-none">
          <div className="border-b border-ink-600 p-4"><p className="text-sm font-semibold">{me.name}</p><p className="text-xs text-fg-dim">{me.title} · {ROLE_LABELS[me.role]}</p></div>
          <div className="p-2">
            <p className="eyebrow px-2 pb-1 pt-1">{s.demo ? "Demo · view as role" : "Switch account"}</p>
            {logins.map((u) => (
              <button key={u.id} type="button" onClick={async () => { await switchUser(u.id); setOpen(false); toast.success(`Now acting as ${ROLE_LABELS[u.role]}`, { description: u.name }); router.refresh(); }}
                className={cn("flex w-full items-center justify-between gap-2 rounded px-2 py-2 text-left text-sm hover:bg-white/5", u.id === me.id && "bg-white/5")}>
                <span className="min-w-0"><span className="block truncate">{ROLE_LABELS[u.role]}</span><span className="block truncate text-xs text-fg-dim">{u.name}</span></span>
                {u.role === me.role && <Check className="h-4 w-4 shrink-0 text-ok" />}
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
