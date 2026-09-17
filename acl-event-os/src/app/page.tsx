"use client";

import { useState } from "react";
import Link from "next/link";
import { Ticket, Banknote, UserCheck, UserMinus, ScanLine, ArrowRight } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { KpiCard, KpiSkeleton } from "@/components/dashboard/KpiCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import {
  SystemStatus, RevenueTracker, SalesChannels, RecentScanPanel, CheckInAnalytics,
  SecurityFeed, RecentSalesTable, GateBoard,
} from "@/components/dashboard/Panels";
import { TierInventoryChart, DistributionDonut, SliceDonut, SalesTrendChart, type TrendMode } from "@/components/charts/Charts";
import { SeatingMap, SeatingLegend, type SectionOccupancy } from "@/components/seating/SeatingMap";
import { Scanner } from "@/components/checkin/Scanner";
import { useAcl } from "@/lib/client/provider";
import { useResource } from "@/lib/client/useResource";
import { formatNaira, formatNumber, countdownTo } from "@/lib/domain/format";

export default function DashboardPage() {
  const { state, loading, now, allows } = useAcl();
  const [trendMode, setTrendMode] = useState<TrendMode>("daily");
  const seating = useResource<{ sections: SectionOccupancy[] }>("/api/seating");

  if (loading && !state) return <DashboardSkeleton />;
  if (!state) return null;

  const { stats, event, wow } = state;
  const c = countdownTo(event.startsAt, now);

  return (
    <div className="space-y-3 p-3 sm:p-4 lg:p-5">
      {/* ---- Event header ---- */}
      <Panel className="overflow-hidden">
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgba(225,16,33,0.16),transparent_58%)]" />
          <div className="pointer-events-none absolute inset-0 acl-grid-bg opacity-50" />
          <div className="relative flex flex-wrap items-end justify-between gap-4 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <p className="acl-label text-acl-red !text-[10px]">ACL Event Dashboard</p>
              <h1 className="mt-1.5 font-display text-[26px] font-black uppercase leading-[0.92] tracking-[-0.025em] text-ink sm:text-[36px]">
                {event.name}
              </h1>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <Badge tone={event.status === "LIVE" ? "ok" : "info"} dot>
                  {event.status.replace("_", " ")}
                </Badge>
                {[
                  ["26 Sep 2026", ""],
                  [event.location, ""],
                  [event.venue, ""],
                  [`${formatNumber(event.capacity)} Capacity`, ""],
                ].map(([label]) => (
                  <span key={label} className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-ink-3">
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-1.5">
              {([["Days", c.days], ["Hrs", c.hours], ["Mins", c.minutes], ["Secs", c.seconds]] as const).map(
                ([label, value]) => (
                  <div key={label} className="acl-inset min-w-[52px] px-2 py-2 text-center">
                    <div className="font-display text-[19px] font-black leading-none tabular-nums text-ink">
                      {String(value).padStart(2, "0")}
                    </div>
                    <div className="mt-1 font-display text-[7.5px] font-bold uppercase tracking-[0.14em] text-ink-4">
                      {label}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </Panel>

      {/* ---- KPIs ---- */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Tickets Sold"
          value={formatNumber(stats.ticketsSold)}
          suffix={`/ ${formatNumber(stats.capacity)}`}
          icon={<Ticket className="h-4 w-4" />}
          tone="red"
          progress={stats.sellThrough}
          delta={wow.tickets}
          sub={`${formatNumber(stats.seatsCommitted)} of ${formatNumber(stats.capacity)} seats committed`}
        />
        <KpiCard
          label="Total Revenue"
          value={formatNaira(stats.revenue)}
          icon={<Banknote className="h-4 w-4" />}
          tone="green"
          progress={stats.revenueProgress}
          progressLabel={`${Math.round(stats.revenueProgress)}%`}
          delta={wow.revenue}
          sub={`Target ${formatNaira(stats.projectedRevenue)}`}
        />
        <KpiCard
          label="Checked In"
          value={formatNumber(stats.checkedIn)}
          icon={<UserCheck className="h-4 w-4" />}
          tone="blue"
          progress={stats.checkedInRate}
          sub={`${formatNumber(state.checkIn.lastHour)} admitted in the last hour`}
        />
        <KpiCard
          label="Awaiting Check-In"
          value={formatNumber(stats.awaitingCheckIn)}
          icon={<UserMinus className="h-4 w-4" />}
          tone="amber"
          progress={stats.awaitingRate}
          sub={`${formatNumber(stats.pending)} pending payment · ${formatNumber(stats.refunded)} refunded`}
        />
        <SystemStatus />
      </div>

      {/* ---- Sales + scanner ---- */}
      <div className="grid gap-3 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          <Panel>
            <PanelHeader
              title="Ticket Sales Overview"
              subtitle="Sold against allocation, by tier"
              action={
                <Tabs
                  size="sm"
                  value={trendMode}
                  onChange={setTrendMode}
                  options={[
                    { value: "daily", label: "Daily" },
                    { value: "weekly", label: "Weekly" },
                    { value: "cumulative", label: "Cumulative" },
                  ]}
                />
              }
            />
            <div className="p-3">
              <TierInventoryChart data={state.breakdown} />
            </div>
            <div className="border-t border-hairline p-3">
              <p className="acl-label mb-2 !text-[9px]">
                {trendMode === "cumulative" ? "Cumulative sales vs remaining inventory" : `Tickets sold — ${trendMode}`}
              </p>
              <SalesTrendChart
                daily={state.trend.daily}
                weekly={state.trend.weekly}
                mode={trendMode}
                capacity={event.capacity}
              />
            </div>
          </Panel>

          <div className="grid gap-3 lg:grid-cols-2">
            <Panel>
              <PanelHeader title="Ticket Distribution" subtitle="Mix of tiers sold" />
              <div className="p-4">
                <DistributionDonut data={state.breakdown} total={stats.ticketsSold} />
              </div>
            </Panel>
            <Panel>
              <PanelHeader title="Payment Status" subtitle="Every ticket, by settlement state" />
              <div className="p-4">
                <SliceDonut slices={state.paymentStatus} total={stats.ticketsSold} centreLabel="Total" />
              </div>
            </Panel>
          </div>
        </div>

        {/* ---- Live scanner column ---- */}
        <div className="space-y-3">
          <Panel accent>
            <PanelHeader
              title="Live Check-In Scanner"
              icon={<ScanLine className="h-3.5 w-3.5" />}
              action={
                <span className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${state.gatesOpen.open ? "bg-ok acl-live-dot" : "bg-warn"}`} />
                  <span className="font-display text-[9.5px] font-bold uppercase tracking-[0.12em] text-ok">
                    {state.gatesOpen.open ? "Online" : "Standby"}
                  </span>
                </span>
              }
            />
            <div className="p-3">
              <Scanner compactResult />
            </div>
            <CheckInAnalytics stats={state.checkIn} checkedIn={stats.checkedIn} />
            <div className="border-t border-hairline p-3">
              <Link
                href="/check-in/log"
                className="flex w-full items-center justify-center gap-2 rounded-[3px] bg-acl-red px-3 py-2.5 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-acl-red-bright"
              >
                View Check-In Log <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Panel>

          <RecentScanPanel scan={state.lastScan} />
        </div>
      </div>

      {/* ---- Revenue / channels / gates ---- */}
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <RevenueTracker
          revenue={stats.revenue}
          projected={stats.projectedRevenue}
          progress={stats.revenueProgress}
          paid={stats.paid}
          pending={stats.pending}
          refunded={stats.refunded}
          pendingValue={stats.pendingValue}
          refundedValue={stats.refundedValue}
        />
        <Panel>
          <PanelHeader title="Payment Methods" subtitle="Transactions by rail" />
          <div className="p-4">
            <SliceDonut
              slices={state.methods}
              total={state.methods.reduce((s, m) => s + m.value, 0)}
              centreLabel="Txns"
            />
          </div>
        </Panel>
        <SalesChannels channels={state.channels} />
        <GateBoard stats={state.checkIn} />
      </div>

      {/* ---- Tables + security + seating ---- */}
      <div className="grid gap-3 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RecentSalesTable sales={state.recentSales} limit={6} />
        </div>
        <div className="space-y-3">
          <SecurityFeed events={state.securityEvents} limit={5} />
          {allows("seating.view") ? (
            <Panel>
              <PanelHeader
                title="Seating Map"
                subtitle={`${formatNumber(event.capacity)} capacity`}
                action={
                  <Link href="/seating" className="flex items-center gap-1 font-display text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-3 transition-colors hover:text-acl-red-bright">
                    Full map <ArrowRight className="h-3 w-3" />
                  </Link>
                }
              />
              <div className="p-3">
                {seating.data ? (
                  <>
                    <SeatingMap sections={seating.data.sections} compact />
                    <div className="mt-2.5">
                      <SeatingLegend sections={seating.data.sections} />
                    </div>
                  </>
                ) : (
                  <Skeleton className="aspect-[4/3] w-full" />
                )}
              </div>
            </Panel>
          ) : null}
        </div>
      </div>

      <QuickActions />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-3 p-3 sm:p-4 lg:p-5">
      <Panel className="p-5">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-3 h-8 w-80" />
        <Skeleton className="mt-3 h-3 w-64" />
      </Panel>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-3">
        <Panel className="p-4 xl:col-span-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-4 h-[210px] w-full" />
        </Panel>
        <Panel className="p-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-4 aspect-[4/3] w-full" />
        </Panel>
      </div>
    </div>
  );
}
