"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search, Bell, Settings, ChevronDown, Menu, ShieldAlert, Ticket as TicketIcon,
  CreditCard, TriangleAlert, Activity, Check, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAcl } from "@/lib/client/provider";
import { apiGet, apiSend } from "@/lib/client/api";
import { ROLE_LABEL } from "@/lib/domain/permissions";
import { formatNaira, relativeTime } from "@/lib/domain/format";
import { Badge } from "@/components/ui/Badge";
import type { Paged } from "@/lib/client/types";
import type { AclNotification, NotificationKind, Ticket } from "@/lib/domain/types";

const KIND_ICON: Record<NotificationKind, React.ElementType> = {
  TICKET_SOLD: TicketIcon,
  PAYMENT_RECEIVED: CreditCard,
  SECURITY_ALERT: ShieldAlert,
  REFUND: CreditCard,
  CAPACITY_WARNING: TriangleAlert,
  SYSTEM: Activity,
};

function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Ticket[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    setBusy(true);
    const timer = window.setTimeout(async () => {
      try {
        const data = await apiGet<Paged<Ticket>>(`/api/tickets?q=${encodeURIComponent(query)}&size=6`);
        setResults(data.rows);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setBusy(false);
      }
    }, 240);
    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <div ref={boxRef} className="relative w-full max-w-[380px]">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results && setOpen(true)}
        placeholder="Search ticket ID, name, phone…"
        aria-label="Search tickets, attendees and phone numbers"
        className="h-9 w-full rounded-[3px] border border-hairline-strong bg-[#08090C] pl-9 pr-14 text-[12.5px] text-ink placeholder:text-ink-4 focus:border-acl-red focus:outline-none focus:ring-1 focus:ring-acl-red/40"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-[2px] border border-hairline-strong px-1.5 py-0.5 font-mono text-[9px] text-ink-4 sm:block">
        ⌘K
      </kbd>
      {busy ? <Loader2 className="absolute right-9 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-ink-4" /> : null}

      {open && results ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-[4px] border border-hairline-strong bg-surface shadow-[0_30px_60px_-20px_rgba(0,0,0,1)]">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-[12px] text-ink-3">No ticket, attendee or number matches “{query}”.</p>
          ) : (
            <ul>
              {results.map((ticket) => (
                <li key={ticket.id}>
                  <button
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                      router.push(`/attendees?q=${encodeURIComponent(ticket.id)}`);
                    }}
                    className="flex w-full items-center justify-between gap-3 border-b border-hairline/60 px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-surface-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[11.5px] text-ink">{ticket.id}</p>
                      <p className="truncate text-[11.5px] text-ink-3">{ticket.attendeeName}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-mono text-[11px] text-ink-2">{formatNaira(ticket.price)}</span>
                      <Badge tone={ticket.status === "USED" ? "ok" : ticket.paymentStatus === "PAID" ? "info" : "warn"}>
                        {ticket.status === "USED" ? "In" : ticket.paymentStatus}
                      </Badge>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function NotificationBell() {
  const { state, refresh } = useAcl();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const notifications: AclNotification[] = state?.notifications ?? [];
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] border border-hairline-strong bg-surface-2 text-ink-2 transition-colors hover:border-acl-red/50 hover:text-ink"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-acl-red px-1 font-mono text-[9px] font-bold text-white">
            {unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="acl-flash-in absolute right-0 top-[calc(100%+8px)] z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-[4px] border border-hairline-strong bg-surface shadow-[0_30px_70px_-20px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between border-b border-hairline px-3.5 py-2.5">
            <h3 className="acl-label text-ink !text-[10px]">Notifications</h3>
            <button
              onClick={async () => {
                await apiSend("/api/notifications", {});
                await refresh();
              }}
              className="flex items-center gap-1 font-display text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-3 transition-colors hover:text-acl-red-bright"
            >
              <Check className="h-3 w-3" /> Mark all read
            </button>
          </div>
          <ul className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-3.5 py-8 text-center text-[12px] text-ink-3">Nothing to report.</li>
            ) : (
              notifications.map((n) => {
                const Icon = KIND_ICON[n.kind];
                const critical = n.priority === "CRITICAL";
                return (
                  <li key={n.id}>
                    <Link
                      href={n.href ?? "#"}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex gap-2.5 border-b border-hairline/60 px-3.5 py-2.5 transition-colors last:border-0 hover:bg-surface-2",
                        !n.read && "bg-surface-2/50",
                        critical && "border-l-2 border-l-acl-red bg-acl-red/[0.06]",
                      )}
                    >
                      <Icon
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          critical ? "text-acl-red-bright" : n.priority === "HIGH" ? "text-warn" : "text-ink-3",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={cn("truncate text-[12px] font-semibold", critical ? "text-acl-red-bright" : "text-ink")}>
                            {n.title}
                          </p>
                          {critical ? <Badge tone="danger">Alert</Badge> : null}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-ink-3">{n.body}</p>
                        <p className="mt-1 font-mono text-[10px] text-ink-4">{relativeTime(n.at)}</p>
                      </div>
                      {!n.read ? <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-acl-red" /> : null}
                    </Link>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** Role switcher — demonstrates that permissions really change the app. */
function ProfileMenu() {
  const { user, setActor, state } = useAcl();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Account and role"
        className="flex shrink-0 items-center gap-2 rounded-[3px] border border-hairline-strong bg-surface-2 py-1 pl-1 pr-1.5 transition-colors hover:border-acl-red/50 sm:pr-2"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-[2px] bg-acl-red/15 font-display text-[10.5px] font-extrabold text-acl-red-bright">
          {user.initials}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-[11.5px] font-semibold leading-tight text-ink">{user.name}</span>
          <span className="block font-display text-[8.5px] font-bold uppercase tracking-[0.12em] text-ink-3">
            {ROLE_LABEL[user.role]}
          </span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-ink-4" />
      </button>

      {open ? (
        <div className="acl-flash-in absolute right-0 top-[calc(100%+8px)] z-50 w-[260px] overflow-hidden rounded-[4px] border border-hairline-strong bg-surface shadow-[0_30px_70px_-20px_rgba(0,0,0,1)]">
          <div className="border-b border-hairline px-3.5 py-2.5">
            <p className="acl-label !text-[9.5px]">Switch operator role</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
              Navigation and actions follow the role&apos;s permissions.
            </p>
          </div>
          <ul className="max-h-[300px] overflow-y-auto">
            {(state?.users ?? []).map((u) => (
              <li key={u.id}>
                <button
                  onClick={() => {
                    setActor(u);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 border-b border-hairline/60 px-3.5 py-2.5 text-left transition-colors last:border-0 hover:bg-surface-2",
                    u.id === user.id && "bg-acl-red/[0.08]",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-ink">{u.name}</p>
                    <p className="font-display text-[9px] font-bold uppercase tracking-[0.12em] text-ink-3">
                      {ROLE_LABEL[u.role]}
                    </p>
                  </div>
                  {u.id === user.id ? <Check className="h-3.5 w-3.5 shrink-0 text-acl-red-bright" /> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const { state, allows } = useAcl();
  const event = state?.event;

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-[#08090C]/92 backdrop-blur-md">
      <div className="flex items-center gap-2.5 px-3 py-2.5 sm:px-4 lg:px-5">
        <button
          onClick={onMenu}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] border border-hairline-strong bg-surface-2 text-ink-2 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="hidden min-w-0 items-center gap-2.5 md:flex">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate font-display text-[13px] font-extrabold uppercase tracking-[0.02em] text-ink">
                {event?.name ?? "Loading event…"}
              </h1>
              {event ? (
                <Badge tone={event.status === "LIVE" ? "ok" : event.status === "ON_SALE" ? "info" : "neutral"} dot>
                  {event.status.replace("_", " ")}
                </Badge>
              ) : null}
            </div>
            <p className="truncate font-display text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-3">
              {event
                ? `26 Sep 2026 · ${event.location} · ${event.venue} · ${event.capacity} capacity`
                : "—"}
            </p>
          </div>
        </div>

        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2 md:flex-none">
          <GlobalSearch />
          <NotificationBell />
          {allows("settings.view") ? (
            <Link
              href="/settings"
              aria-label="Event settings"
              className="hidden h-9 w-9 items-center justify-center rounded-[3px] border border-hairline-strong bg-surface-2 text-ink-2 transition-colors hover:border-acl-red/50 hover:text-ink sm:flex"
            >
              <Settings className="h-4 w-4" />
            </Link>
          ) : null}
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
