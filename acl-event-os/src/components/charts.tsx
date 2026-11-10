"use client";

/**
 * Charts. One y-axis per chart, recessive grid, legend for ≥2 series, hover
 * tooltip on every plot. Colours come from src/lib/theme.ts (validated palette).
 */
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { naira } from "@/lib/format";
import { CHART } from "@/lib/theme";

const axis = { stroke: CHART.axis, fontSize: 11, tickLine: false, axisLine: false } as const;
const tipBox = "border border-ink-500 bg-ink-900/95 px-3 py-2 text-xs shadow-2xl backdrop-blur";

export interface Series { key: string; label: string; color: string; format?: (n: number) => string; dashed?: boolean }

function Tip({ active, payload, label, series, extra }: { active?: boolean; payload?: { dataKey?: string | number; value?: number; payload?: Record<string, unknown> }[]; label?: string; series: Series[]; extra?: (row: Record<string, unknown>) => [string, string][] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload ?? {};
  return (
    <div className={tipBox}>
      <div className="mb-1 font-semibold text-fg">{String(row.label ?? label)}</div>
      {series.map((s) => (
        <div key={s.key} className="flex items-center justify-between gap-5 text-fg-muted">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}</span>
          <span className="tabular-nums text-fg">{(s.format ?? ((n: number) => n.toLocaleString()))(Number(row[s.key] ?? 0))}</span>
        </div>
      ))}
      {extra?.(row).map(([k, v]) => <div key={k} className="flex justify-between gap-5 text-fg-dim"><span>{k}</span><span className="tabular-nums">{v}</span></div>)}
    </div>
  );
}

export function Legend({ items, className }: { items: { label: string; color: string; value?: string; dashed?: boolean }[]; className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted ${className ?? ""}`}>
      {items.map((i) => <li key={i.label} className="flex items-center gap-1.5"><span className="h-2 w-3" style={i.dashed ? { borderTop: `2px dashed ${i.color}`, height: 0 } : { background: i.color }} />{i.label}{i.value && <span className="tabular-nums text-fg">{i.value}</span>}</li>)}
    </ul>
  );
}

type Row = Record<string, string | number>;

export function BarsChart({ data, series, height = 260, extra }: { data: Row[]; series: Series; height?: number; extra?: (row: Record<string, unknown>) => [string, string][] }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="22%">
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={24} />
        <YAxis {...axis} allowDecimals={false} tickFormatter={series.format} width={series.format ? 64 : 48} />
        <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} content={<Tip series={[series]} extra={extra} />} />
        <Bar dataKey={series.key} fill={series.color} radius={[3, 3, 0, 0]} maxBarSize={36} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LinesChart({ data, series, height = 260, yFormat, yWidth = 48 }: { data: Row[]; series: Series[]; height?: number; yFormat?: (n: number) => string; yWidth?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: yFormat ? 0 : -18, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={40} />
        <YAxis {...axis} allowDecimals={false} tickFormatter={yFormat} width={yFormat ? 56 : yWidth} />
        <Tooltip cursor={{ stroke: CHART.axis, strokeDasharray: "3 3" }} content={<Tip series={series} />} />
        {series.map((s) => <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? "5 4" : undefined} dot={false} activeDot={{ r: 4, stroke: CHART.surface, strokeWidth: 2 }} isAnimationActive={false} />)}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function AreaTrend({ data, series, height = 200, yFormat }: { data: Row[]; series: Series; height?: number; yFormat?: (n: number) => string }) {
  const id = `area-${series.key}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={series.color} stopOpacity={0.32} /><stop offset="1" stopColor={series.color} stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={40} />
        <YAxis {...axis} tickFormatter={yFormat} width={56} />
        <Tooltip cursor={{ stroke: CHART.axis, strokeDasharray: "3 3" }} content={<Tip series={[series]} />} />
        <Area type="monotone" dataKey={series.key} stroke={series.color} strokeWidth={2} fill={`url(#${id})`} activeDot={{ r: 4, stroke: CHART.surface, strokeWidth: 2 }} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export interface Slice { key: string; label: string; value: number; color: string; detail?: string }

/** Donut with the total in the hole and a labelled legend — identity is never colour alone. */
export function Donut({ slices, centerLabel, centerValue, size = 190 }: { slices: Slice[]; centerLabel: string; centerValue: string; size?: number }) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const shown = slices.filter((s) => s.value > 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center xl:flex-col 2xl:flex-row">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={({ active, payload }) => { if (!active || !payload?.length) return null; const p = payload[0].payload as Slice; return <div className={tipBox}><div className="flex items-center gap-1.5 font-semibold"><span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.label}</div><div className="tabular-nums text-fg-muted">{p.value.toLocaleString()} · {total ? Math.round((p.value / total) * 100) : 0}%{p.detail ? ` · ${p.detail}` : ""}</div></div>; }} />
            <Pie data={shown} dataKey="value" nameKey="label" innerRadius="66%" outerRadius="100%" paddingAngle={shown.length > 1 ? 1.5 : 0} stroke={CHART.surface} strokeWidth={2} startAngle={90} endAngle={-270} isAnimationActive={false}>
              {shown.map((s) => <Cell key={s.key} fill={s.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums leading-none">{centerValue}</span>
          <span className="eyebrow mt-1">{centerLabel}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-1.5 text-sm">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0" style={{ background: s.color }} /><span className="truncate text-fg-muted">{s.label}</span></span>
            <span className="shrink-0 tabular-nums"><span className="text-fg">{s.value.toLocaleString()}</span><span className="ml-2 inline-block w-9 text-right text-xs text-fg-dim">{total ? Math.round((s.value / total) * 100) : 0}%</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const compactNaira = (n: number) => naira(n, { compact: true });
