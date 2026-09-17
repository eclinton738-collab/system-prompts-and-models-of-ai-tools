"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AclLogo } from "@/components/brand/AclLogo";
import { NAV_ITEMS } from "./nav";
import { useAcl } from "@/lib/client/provider";
import { ROLE_LABEL } from "@/lib/domain/permissions";
import { countdownTo } from "@/lib/domain/format";
import { X } from "lucide-react";

function Countdown() {
  const { state, now } = useAcl();
  if (!state) return null;
  const c = countdownTo(state.event.startsAt, now);
  const cells: Array<[string, number]> = [
    ["Days", c.days],
    ["Hrs", c.hours],
    ["Mins", c.minutes],
    ["Secs", c.seconds],
  ];
  return (
    <div className="border-t border-hairline px-3 py-3">
      <p className="acl-label mb-2 text-center !text-[8.5px]">
        {c.elapsed ? "Event underway" : "Event starts in"}
      </p>
      <div className="grid grid-cols-4 gap-1">
        {cells.map(([label, value]) => (
          <div key={label} className="acl-inset px-1 py-1.5 text-center">
            <div className="font-display text-[15px] font-extrabold leading-none tabular-nums text-ink">
              {String(value).padStart(2, "0")}
            </div>
            <div className="mt-1 font-display text-[7px] font-bold uppercase tracking-[0.12em] text-ink-4">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, allows } = useAcl();

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#0B0C10] to-[#060709]">
      <div className="relative border-b border-hairline px-4 pb-4 pt-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(225,16,33,0.14),transparent_62%)]" />
        <Link href="/" onClick={onNavigate} className="relative block" aria-label="ACL Event OS — dashboard">
          <AclLogo />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Main">
        <ul className="space-y-0.5">
          {NAV_ITEMS.filter((item) => allows(item.permission)).map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-[3px] px-3 py-2.5 font-display text-[11.5px] font-semibold tracking-[0.02em] transition-all",
                    active
                      ? "bg-acl-red text-white shadow-[0_8px_20px_-12px_rgba(225,16,33,1)]"
                      : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  {active ? (
                    <span className="absolute inset-y-0 left-0 w-[3px] bg-gold" aria-hidden />
                  ) : null}
                  <Icon className={cn("h-[15px] w-[15px] shrink-0", active ? "text-white" : "text-ink-3 group-hover:text-acl-red")} />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Cinematic brand block — the only decorative surface in the shell. */}
      <div className="relative mx-2 mb-2 overflow-hidden rounded-[3px] border border-hairline">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(225,16,33,0.35),transparent_60%),radial-gradient(ellipse_at_80%_90%,rgba(228,177,62,0.16),transparent_55%)]" />
        <div className="absolute inset-0 acl-hatch opacity-40" />
        <div className="relative px-3 py-4">
          <p className="font-display text-[17px] font-black uppercase leading-[0.9] tracking-[-0.02em] text-ink">
            More than
            <br />
            fights
          </p>
          <p className="mt-1 font-display text-[17px] font-black uppercase leading-[0.9] tracking-[-0.02em] text-acl-red-bright">
            A movement
          </p>
          <p className="mt-2 font-display text-[7.5px] font-bold uppercase tracking-[0.18em] text-ink-3">
            Fighters. Stories. Africa. The world.
          </p>
        </div>
      </div>

      <Countdown />

      <div className="flex items-center gap-2.5 border-t border-hairline px-3 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] border border-acl-red/40 bg-acl-red/15 font-display text-[11px] font-extrabold text-acl-red-bright">
          {user.initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-ink">{user.name}</p>
          <p className="truncate font-display text-[9px] font-bold uppercase tracking-[0.12em] text-ink-3">
            {ROLE_LABEL[user.role]}
          </p>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      <aside className="hidden w-[212px] shrink-0 border-r border-hairline lg:block">
        <div className="fixed inset-y-0 left-0 w-[212px] border-r border-hairline">
          <SidebarContent />
        </div>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} aria-hidden />
          <div className="acl-slide-in absolute inset-y-0 left-0 w-[250px] border-r border-hairline-strong">
            <button
              onClick={onClose}
              className="absolute right-2 top-2 z-10 rounded-[3px] border border-hairline-strong bg-surface-2 p-1.5 text-ink-2"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent onNavigate={onClose} />
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Mobile bottom navigation — thumb-reachable, scanner front and centre. */
export function BottomNav() {
  const pathname = usePathname();
  const { allows } = useAcl();
  const items = NAV_ITEMS.filter((i) => i.primary && allows(i.permission));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid border-t border-hairline-strong bg-[#08090C]/95 backdrop-blur lg:hidden"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      aria-label="Primary"
    >
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 font-display text-[9px] font-bold uppercase tracking-[0.1em] transition-colors",
              active ? "text-acl-red-bright" : "text-ink-3",
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            {item.short}
          </Link>
        );
      })}
    </nav>
  );
}
