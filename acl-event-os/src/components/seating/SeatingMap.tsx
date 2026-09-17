"use client";

import { cn } from "@/lib/utils";
import { TYPE_COLOR } from "@/lib/domain/catalog";
import { formatNaira, formatNumber } from "@/lib/domain/format";
import type { SeatSectionCode, TicketTypeCode } from "@/lib/domain/types";

export interface SectionOccupancy {
  code: SeatSectionCode;
  name: string;
  capacity: number;
  ticketType?: TicketTypeCode;
  x: number;
  y: number;
  w: number;
  h: number;
  tone: string;
  sold: number;
  available: number;
  revenue: number;
  checkedIn: number;
  tickets: number;
  seatsPerTicket: number;
}

const STRUCTURE: Partial<Record<SeatSectionCode, string>> = {
  STAGE: "border-acl-red/60 bg-acl-red/10 text-acl-red-bright",
  ENTRANCE: "border-ok/50 bg-ok/10 text-ok",
  EXIT: "border-warn/50 bg-warn/10 text-warn",
};

/**
 * The 500-seat arena, drawn on a 100×100 grid.
 *
 * Fill opacity tracks occupancy, so a glance shows which blocks are filling.
 */
export function SeatingMap({
  sections,
  selected,
  onSelect,
  compact = false,
}: {
  sections: SectionOccupancy[];
  selected?: string | null;
  onSelect?: (code: SeatSectionCode) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("relative w-full overflow-hidden rounded-[3px] border border-hairline bg-[#06070A]", compact ? "aspect-[4/3]" : "aspect-[5/4]")}>
      <div className="absolute inset-0 acl-grid-bg opacity-60" />
      {sections.map((section) => {
        const structural = STRUCTURE[section.code];
        const fill = section.capacity ? section.sold / section.capacity : 0;
        const color = section.ticketType ? TYPE_COLOR[section.ticketType] : "#39404C";
        const isSelected = selected === section.code;
        const interactive = Boolean(onSelect) && Boolean(section.ticketType);

        return (
          <button
            key={section.code}
            type="button"
            disabled={!interactive}
            onClick={() => onSelect?.(section.code)}
            aria-label={
              section.ticketType
                ? `${section.name}: ${section.sold} of ${section.capacity} seats sold`
                : section.name
            }
            aria-pressed={interactive ? isSelected : undefined}
            className={cn(
              "absolute flex flex-col items-center justify-center overflow-hidden rounded-[2px] border px-1 text-center transition-all",
              structural ?? "border-hairline-strong",
              interactive && "cursor-pointer hover:brightness-125",
              isSelected && "ring-2 ring-gold ring-offset-1 ring-offset-[#06070A]",
              !interactive && "cursor-default",
            )}
            style={{
              left: `${section.x}%`,
              top: `${section.y}%`,
              width: `${section.w}%`,
              height: `${section.h}%`,
              ...(structural
                ? {}
                : {
                    backgroundColor: `${color}${Math.round(18 + fill * 60).toString(16).padStart(2, "0")}`,
                    borderColor: isSelected ? "#E4B13E" : `${color}88`,
                  }),
            }}
          >
            <span
              className={cn(
                "font-display font-bold uppercase leading-[1.05] tracking-[0.06em]",
                compact ? "text-[6.5px]" : "text-[8px]",
                structural ? "" : "text-white/90",
              )}
            >
              {section.name}
            </span>
            {section.ticketType && !compact ? (
              <span className="mt-0.5 font-mono text-[8px] text-white/70">
                {section.sold}/{section.capacity}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function SectionDetail({ section }: { section: SectionOccupancy }) {
  const rows: Array<[string, string]> = [
    ["Capacity", formatNumber(section.capacity)],
    ["Sold", formatNumber(section.sold)],
    ["Available", formatNumber(section.available)],
    ["Revenue", formatNaira(section.revenue)],
    ["Checked in", formatNumber(section.checkedIn)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="acl-label !text-[8.5px]">{label}</dt>
          <dd className="mt-1 font-mono text-[13px] font-semibold text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SeatingLegend({ sections }: { sections: SectionOccupancy[] }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
      {sections
        .filter((s) => s.ticketType)
        .map((section) => (
          <li key={section.code} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-[1px]"
              style={{ background: section.ticketType ? TYPE_COLOR[section.ticketType] : "#39404C" }}
              aria-hidden
            />
            <span className="text-[11px] text-ink-2">{section.name}</span>
          </li>
        ))}
      <li className="flex items-center gap-1.5">
        <span className="h-2 w-2 shrink-0 rounded-[1px] border border-ok/60 bg-ok/30" aria-hidden />
        <span className="text-[11px] text-ink-2">Entrance</span>
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-2 w-2 shrink-0 rounded-[1px] border border-warn/60 bg-warn/30" aria-hidden />
        <span className="text-[11px] text-ink-2">Exit</span>
      </li>
    </ul>
  );
}
