"use client";

import { useMemo } from "react";
import { AreaTrend, compactNaira } from "@/components/charts";
import { DistributionPanel, KpiCards, PaymentMethodsPanel, RecentSalesTable, RevenuePanel, SalesByTypeTable, SalesTrendPanel } from "@/components/features/widgets";
import { useOps } from "@/components/ops-provider";
import { PageHeader, Panel } from "@/components/ui";
import { naira } from "@/lib/format";
import { agentStats, revenue, salesTrend } from "@/lib/metrics";
import { CHART } from "@/lib/theme";

export default function SalesPage() {
  const { s, ix } = useOps();
  const r = useMemo(() => revenue(s, ix), [s, ix]);
  const daily = useMemo(() => salesTrend(s, ix, "daily"), [s, ix]);
  const agents = useMemo(() => agentStats(s, ix), [s, ix]);
  const viaAgents = agents.reduce((a, x) => a + x.revenue, 0);
  const tiles: [string, string, string][] = [
    ["Average order value", naira(r.avgOrder), "per paid transaction"],
    ["Awaiting payment", naira(r.pending), "bank transfer & USSD orders"],
    ["Agent network revenue", naira(viaAgents), `${r.paid ? Math.round((viaAgents / r.paid) * 100) : 0}% of revenue`],
    ["Gap to projection", naira(Math.max(0, r.target - r.paid)), `${Math.round(r.progress * 100)}% reached`],
  ];
  return (
    <div className="space-y-4">
      <PageHeader title="Sales & Revenue" subtitle="Live commercial performance. All figures are computed from ticket and payment records." />
      <KpiCards />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {tiles.map(([label, value, foot]) => <div key={label} className="panel p-4"><div className="eyebrow">{label}</div><div className="mt-2 truncate text-2xl font-semibold tabular-nums">{value}</div><div className="mt-1 text-xs text-fg-dim">{foot}</div></div>)}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <SalesTrendPanel className="xl:col-span-2" />
        <DistributionPanel />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <RevenuePanel chartHeight={200} />
        <Panel title="Daily Revenue" eyebrow="Last 14 days" className="xl:col-span-2">
          <AreaTrend data={daily as never} series={{ key: "revenue", label: "Revenue", color: CHART.revenue, format: naira }} yFormat={compactNaira} height={330} />
        </Panel>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <SalesByTypeTable detailed className="xl:col-span-2" />
        <PaymentMethodsPanel />
      </div>
      <RecentSalesTable pageSize={12} />
    </div>
  );
}
