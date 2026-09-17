"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AXIS_PROPS, ChartLegend, ChartTooltip, GRID, count, nairaCompact } from "./theme";
import { TYPE_COLOR, TICKET_TYPES } from "@/lib/domain/catalog";
import { formatNaira, formatNumber } from "@/lib/domain/format";
import type { TypeBreakdown, TrendPoint, WeeklyPoint, Slice, CheckInStats } from "@/lib/domain/stats";
import type { TicketTypeCode } from "@/lib/domain/types";

/**
 * Sold vs remaining per tier.
 *
 * Both series are ticket counts on one axis and sum to the tier's allocation,
 * so stacking them is a true part-to-whole — never a second scale.
 */
export function TierInventoryChart({ data }: { data: TypeBreakdown[] }) {
  const rows = data.map((d) => ({
    tier: TICKET_TYPES[d.type].name.replace(" Table", ""),
    price: d.price,
    sold: d.sold,
    remaining: d.remaining,
    allocation: d.allocation,
    color: TYPE_COLOR[d.type],
  }));

  return (
    <div>
      <ChartLegend
        className="mb-2 px-1"
        items={[
          { label: "Sold", color: "#E11021" },
          { label: "Remaining", color: "#2B313B" },
        ]}
      />
      <ResponsiveContainer width="100%" height={210}>
        <BarChart data={rows} margin={{ top: 18, right: 6, left: 0, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="tier" {...AXIS_PROPS} interval={0} tick={{ fill: "#6E7683", fontSize: 9.5, fontWeight: 700 }} />
          <YAxis {...AXIS_PROPS} width={34} tickFormatter={count} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.035)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as (typeof rows)[number];
              return (
                <ChartTooltip
                  title={`${row.tier} — ${formatNaira(row.price)}`}
                  rows={[
                    { label: "Sold", value: formatNumber(row.sold), color: row.color },
                    { label: "Remaining", value: formatNumber(row.remaining), color: "#2B313B" },
                    { label: "Allocation", value: formatNumber(row.allocation) },
                  ]}
                  footer={`Revenue ${formatNaira(row.sold * row.price)}`}
                />
              );
            }}
          />
          {/* 2px gap between stacked segments keeps the boundary readable. */}
          <Bar dataKey="sold" stackId="a" fill="#E11021" maxBarSize={30}>
            {rows.map((row) => (
              <Cell key={row.tier} fill={row.color} />
            ))}
          </Bar>
          <Bar dataKey="remaining" stackId="a" fill="#2B313B" radius={[3, 3, 0, 0]} maxBarSize={30}>
            {/* Tiers differ by two orders of magnitude, so each total is
                labelled rather than left to the eye. */}
            <LabelList
              dataKey="allocation"
              position="top"
              offset={6}
              content={({ x, y, width, index }) => {
                const row = rows[index as number];
                if (!row) return null;
                return (
                  <text
                    x={Number(x) + Number(width) / 2}
                    y={Number(y) - 6}
                    textAnchor="middle"
                    fill="#F4F6F8"
                    fontSize={10}
                    fontWeight={700}
                    fontFamily="var(--font-display)"
                  >
                    {row.sold}
                    <tspan fill="#6E7683">/{row.allocation}</tspan>
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Ticket mix. Slices are ordered by tier and every one is labelled. */
export function DistributionDonut({
  data,
  total,
}: {
  data: TypeBreakdown[];
  total: number;
}) {
  const rows = data.filter((d) => d.sold > 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative h-[172px] w-[172px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="sold"
              nameKey="name"
              innerRadius={54}
              outerRadius={82}
              paddingAngle={2}
              stroke="#0D0F13"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
            >
              {rows.map((row) => (
                <Cell key={row.type} fill={TYPE_COLOR[row.type]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as TypeBreakdown;
                return (
                  <ChartTooltip
                    title={row.name}
                    rows={[
                      { label: "Sold", value: formatNumber(row.sold), color: TYPE_COLOR[row.type] },
                      { label: "Share", value: `${row.share.toFixed(1)}%` },
                      { label: "Revenue", value: formatNaira(row.revenue) },
                    ]}
                  />
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="acl-stat text-[26px] leading-none text-ink">{formatNumber(total)}</span>
          <span className="acl-label mt-1 !text-[8.5px]">Sold</span>
        </div>
      </div>

      {/* Legend doubles as the data table: name, count and share in text. */}
      <ul className="w-full min-w-0 flex-1 space-y-1.5">
        {data.map((row) => (
          <li key={row.type} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[1px]" style={{ background: TYPE_COLOR[row.type] }} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-[12px] text-ink-2">{row.name}</span>
            <span className="font-mono text-[12px] font-semibold text-ink">{formatNumber(row.sold)}</span>
            <span className="w-11 shrink-0 text-right font-mono text-[11px] text-ink-4">
              {row.share.toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Generic status/method donut driven by pre-computed slices. */
export function SliceDonut({
  slices,
  total,
  centreLabel,
  valueFormatter = formatNumber,
}: {
  slices: Slice[];
  total: number;
  centreLabel: string;
  valueFormatter?: (n: number) => string;
}) {
  const rows = slices.filter((s) => s.value > 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-[150px] w-[150px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              nameKey="label"
              innerRadius={47}
              outerRadius={71}
              paddingAngle={2}
              stroke="#0D0F13"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
            >
              {rows.map((row) => (
                <Cell key={row.key} fill={row.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as Slice;
                return (
                  <ChartTooltip
                    title={row.label}
                    rows={[
                      { label: "Count", value: formatNumber(row.value), color: row.color },
                      { label: "Share", value: `${row.share.toFixed(1)}%` },
                      { label: "Value", value: formatNaira(row.amount) },
                    ]}
                  />
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="acl-stat text-[22px] leading-none text-ink">{valueFormatter(total)}</span>
          <span className="acl-label mt-1 !text-[8.5px]">{centreLabel}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-1.5">
        {slices.map((row) => (
          <li key={row.key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[1px]" style={{ background: row.color }} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-[12px] text-ink-2">{row.label}</span>
            <span className="font-mono text-[12px] font-semibold text-ink">{formatNumber(row.value)}</span>
            <span className="w-11 shrink-0 text-right font-mono text-[11px] text-ink-4">{row.share.toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type TrendMode = "daily" | "weekly" | "cumulative";

/**
 * Sales over time.
 *
 * Daily and weekly plot tickets sold. Cumulative stacks sold against inventory
 * remaining — both ticket counts summing to capacity, so one axis holds them.
 */
export function SalesTrendChart({
  daily,
  weekly,
  mode,
  capacity,
}: {
  daily: TrendPoint[];
  weekly: WeeklyPoint[];
  mode: TrendMode;
  capacity: number;
}) {
  if (mode === "cumulative") {
    return (
      <div>
        <ChartLegend
          className="mb-2 px-1"
          items={[
            { label: "Tickets sold", color: "#E11021" },
            { label: "Inventory remaining", color: "#2B313B" },
          ]}
        />
        <ResponsiveContainer width="100%" height={230}>
          <AreaChart data={daily} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="acl-sold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E11021" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#E11021" stopOpacity={0.06} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={28} />
            <YAxis {...AXIS_PROPS} width={34} domain={[0, capacity]} tickFormatter={count} />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.18)", strokeWidth: 1 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as TrendPoint;
                return (
                  <ChartTooltip
                    title={String(label)}
                    rows={[
                      { label: "Sold to date", value: formatNumber(row.cumulativeSold), color: "#E11021" },
                      { label: "Remaining", value: formatNumber(row.remaining), color: "#2B313B" },
                      { label: "Revenue to date", value: formatNaira(row.cumulativeRevenue) },
                    ]}
                  />
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="cumulativeSold"
              stackId="1"
              stroke="#E11021"
              strokeWidth={2}
              fill="url(#acl-sold)"
            />
            <Area type="monotone" dataKey="remaining" stackId="1" stroke="#39404C" strokeWidth={1} fill="#181C23" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const rows =
    mode === "weekly"
      ? weekly.map((w) => ({ label: w.label, sold: w.sold, revenue: w.revenue }))
      : daily.map((d) => ({ label: d.label, sold: d.sold, revenue: d.revenue }));

  return (
    <div>
      {/* One series: the panel title names it, so no legend box is needed. */}
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={rows} margin={{ top: 12, right: 6, left: 0, bottom: 0 }} barCategoryGap={mode === "weekly" ? "34%" : "18%"}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={mode === "weekly" ? 4 : 24} />
          <YAxis {...AXIS_PROPS} width={34} tickFormatter={count} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.035)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as { sold: number; revenue: number };
              return (
                <ChartTooltip
                  title={String(label)}
                  rows={[
                    { label: "Tickets sold", value: formatNumber(row.sold), color: "#E11021" },
                    { label: "Revenue", value: formatNaira(row.revenue) },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="sold" fill="#E11021" radius={[3, 3, 0, 0]} maxBarSize={mode === "weekly" ? 48 : 18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Settled revenue per day. Single series, so the title carries identity. */
export function RevenueTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="acl-rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#17C26B" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#17C26B" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={30} />
        <YAxis {...AXIS_PROPS} width={52} tickFormatter={nairaCompact} />
        <Tooltip
          cursor={{ stroke: "rgba(255,255,255,0.18)", strokeWidth: 1 }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0].payload as TrendPoint;
            return (
              <ChartTooltip
                title={String(label)}
                rows={[
                  { label: "Revenue", value: formatNaira(row.revenue), color: "#17C26B" },
                  { label: "Tickets", value: formatNumber(row.sold) },
                ]}
                footer={`Cumulative ${formatNaira(row.cumulativeRevenue)}`}
              />
            );
          }}
        />
        <Area type="monotone" dataKey="revenue" stroke="#17C26B" strokeWidth={2} fill="url(#acl-rev)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Gate throughput: admitted against refused, hour by hour. */
export function CheckInFlowChart({ stats }: { stats: CheckInStats }) {
  return (
    <div>
      <ChartLegend
        className="mb-2 px-1"
        items={[
          { label: "Admitted", color: "#17C26B" },
          { label: "Refused", color: "#FF3B3B" },
        ]}
      />
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={stats.perHour} margin={{ top: 8, right: 6, left: 0, bottom: 0 }} barGap={2}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} width={32} tickFormatter={count} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.035)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as { granted: number; rejected: number };
              return (
                <ChartTooltip
                  title={`Hour to ${label}`}
                  rows={[
                    { label: "Admitted", value: formatNumber(row.granted), color: "#17C26B" },
                    { label: "Refused", value: formatNumber(row.rejected), color: "#FF3B3B" },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="granted" fill="#17C26B" radius={[3, 3, 0, 0]} maxBarSize={22} />
          <Bar dataKey="rejected" fill="#FF3B3B" radius={[3, 3, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TierLegendDot({ type }: { type: TicketTypeCode }) {
  return <span className="inline-block h-2 w-2 rounded-[1px]" style={{ background: TYPE_COLOR[type] }} aria-hidden />;
}
