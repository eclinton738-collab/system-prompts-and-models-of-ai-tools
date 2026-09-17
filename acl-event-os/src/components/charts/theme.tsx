"use client";

import { formatNaira, formatNumber } from "@/lib/domain/format";

/** Chart surface the palette was validated against. */
export const CHART_SURFACE = "#0D0F13";
export const GRID = "rgba(255,255,255,0.055)";
export const AXIS_INK = "#6E7683";

export const axisTick = { fill: AXIS_INK, fontSize: 10, fontWeight: 600 } as const;

export const AXIS_PROPS = {
  stroke: "transparent",
  tickLine: false,
  axisLine: false,
  tick: axisTick,
} as const;

interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

/** One tooltip shape for every chart in the app. */
export function ChartTooltip({
  title,
  rows,
  footer,
}: {
  title: string;
  rows: TooltipRow[];
  footer?: string;
}) {
  return (
    <div className="pointer-events-none min-w-[150px] rounded-[3px] border border-hairline-strong bg-[#0B0D11] px-2.5 py-2 shadow-[0_18px_40px_-16px_rgba(0,0,0,1)]">
      <p className="acl-label mb-1.5 !text-[9px] text-ink-2">{title}</p>
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[11px] text-ink-3">
              {row.color ? (
                <span className="h-2 w-2 shrink-0 rounded-[1px]" style={{ background: row.color }} />
              ) : null}
              {row.label}
            </span>
            <span className="font-mono text-[11px] font-semibold text-ink">{row.value}</span>
          </li>
        ))}
      </ul>
      {footer ? <p className="mt-1.5 border-t border-hairline pt-1.5 text-[10px] text-ink-4">{footer}</p> : null}
    </div>
  );
}

export const naira = (v: number) => formatNaira(v);
export const nairaCompact = (v: number) => formatNaira(v, { compact: true });
export const count = (v: number) => formatNumber(v);

/** Shared legend. Always rendered when a chart carries two or more series. */
export function ChartLegend({
  items,
  className = "",
}: {
  items: Array<{ label: string; color: string; value?: string; pattern?: boolean }>;
  className?: string;
}) {
  return (
    <ul className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${className}`}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 shrink-0 rounded-[1px]"
            style={{ background: item.color }}
            aria-hidden
          />
          <span className="text-[11px] text-ink-2">{item.label}</span>
          {item.value ? <span className="font-mono text-[11px] text-ink-3">{item.value}</span> : null}
        </li>
      ))}
    </ul>
  );
}
