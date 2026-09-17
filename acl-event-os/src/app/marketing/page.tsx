"use client";

import { useState } from "react";
import { Megaphone, Copy, Check, TrendingUp, Target, Clock } from "lucide-react";
import { Guard } from "@/components/layout/Guard";
import { PageHeader } from "@/components/layout/AppShell";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { DataTable, Th, Td, Tr } from "@/components/ui/Table";
import { RevenueTrendChart, TierLegendDot } from "@/components/charts/Charts";
import { SalesChannels } from "@/components/dashboard/Panels";
import { useAcl } from "@/lib/client/provider";
import { useToast } from "@/components/ui/Toast";
import { formatNaira, formatNumber, formatDate, countdownTo } from "@/lib/domain/format";

const TAGLINES = [
  "UNCHAINED. UNBREAKABLE. UNBOUND.",
  "FIGHTERS. STORIES. AFRICA. THE WORLD.",
  "BUILT BY FIGHTERS FOR FIGHTERS.",
  "ACL — BORN TO BE GREAT.",
  "MORE THAN FIGHTS. A MOVEMENT.",
];

export default function MarketingPage() {
  return (
    <Guard permission="marketing.view">
      <Marketing />
    </Guard>
  );
}

function Marketing() {
  const { state, now } = useAcl();
  const toast = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  if (!state) return null;

  const { stats, breakdown, trend, event } = state;

  // Sell-out projection from the last seven days of real sales.
  const lastSeven = trend.daily.slice(-7);
  const dailyPace = lastSeven.reduce((s, d) => s + d.sold, 0) / Math.max(1, lastSeven.length);
  const inventoryLeft = breakdown.reduce((s, b) => s + b.remaining, 0);
  const daysToSellOut = dailyPace > 0 ? inventoryLeft / dailyPace : Infinity;
  const daysToEvent = Math.max(0, countdownTo(event.startsAt, now).days);
  const willSellOut = daysToSellOut <= daysToEvent;
  const projectedDate = Number.isFinite(daysToSellOut)
    ? formatDate(new Date(now + daysToSellOut * 86_400_000))
    : "—";

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      toast.push({ tone: "error", title: "Copy failed", body: "Your browser blocked clipboard access." });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="ACL Marketing"
        title="Marketing & Demand"
        description="Where demand is coming from, how fast the building is filling, and the brand assets the team pushes out."
      />

      <div className="space-y-3 p-3 sm:p-4 lg:p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Tile
            icon={<TrendingUp className="h-4 w-4" />}
            label="Sales pace"
            value={`${dailyPace.toFixed(1)}/day`}
            sub="Average over the last 7 days"
            tone="text-acl-red-bright"
          />
          <Tile
            icon={<Target className="h-4 w-4" />}
            label="Inventory left"
            value={formatNumber(inventoryLeft)}
            sub={`${formatNumber(stats.ticketsSold)} of ${formatNumber(event.capacity)} committed`}
            tone="text-ink"
          />
          <Tile
            icon={<Clock className="h-4 w-4" />}
            label="Projected sell-out"
            value={Number.isFinite(daysToSellOut) ? `${Math.ceil(daysToSellOut)}d` : "—"}
            sub={projectedDate}
            tone={willSellOut ? "text-ok" : "text-warn"}
          />
          <Tile
            icon={<Megaphone className="h-4 w-4" />}
            label="Days to fight night"
            value={`${daysToEvent}d`}
            sub={willSellOut ? "On track to sell out" : "Needs a push to sell out"}
            tone={willSellOut ? "text-ok" : "text-warn"}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Panel>
              <PanelHeader title="Revenue Momentum" subtitle="Settled revenue per day, last 30 days" />
              <div className="p-3">
                <RevenueTrendChart data={trend.daily} />
              </div>
            </Panel>
          </div>
          <SalesChannels channels={state.channels} />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Tier Demand" subtitle="Where the push is working, and where it is not" />
            <DataTable>
              <thead>
                <tr>
                  <Th>Tier</Th>
                  <Th align="right">Sold</Th>
                  <Th align="right">Sell-through</Th>
                  <Th align="right">Revenue</Th>
                  <Th>Signal</Th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((row) => {
                  const rate = row.allocation ? (row.sold / row.allocation) * 100 : 0;
                  return (
                    <Tr key={row.type}>
                      <Td>
                        <span className="flex items-center gap-1.5">
                          <TierLegendDot type={row.type} />
                          <span className="text-ink">{row.name}</span>
                        </span>
                      </Td>
                      <Td align="right" mono>
                        {formatNumber(row.sold)}/{formatNumber(row.allocation)}
                      </Td>
                      <Td align="right" mono>{rate.toFixed(0)}%</Td>
                      <Td align="right" mono className="text-ok">{formatNaira(row.revenue, { compact: true })}</Td>
                      <Td>
                        {rate >= 85 ? (
                          <Badge tone="ok" dot>
                            Nearly gone
                          </Badge>
                        ) : rate >= 45 ? (
                          <Badge tone="info">Healthy</Badge>
                        ) : (
                          <Badge tone="warn">Needs push</Badge>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </DataTable>
          </Panel>

          <Panel>
            <PanelHeader title="Agent Leaderboard" subtitle="Field sales driving the gate" />
            <DataTable>
              <thead>
                <tr>
                  <Th>Agent</Th>
                  <Th>Location</Th>
                  <Th align="right">Sales</Th>
                  <Th align="right">Revenue</Th>
                </tr>
              </thead>
              <tbody>
                {state.agents.slice(0, 6).map((row, i) => (
                  <Tr key={row.agent.id}>
                    <Td>
                      <span className="flex items-center gap-2">
                        <span className={`font-mono text-[11px] ${i === 0 ? "text-gold" : "text-ink-4"}`}>#{i + 1}</span>
                        <span className="text-ink">{row.agent.name}</span>
                      </span>
                    </Td>
                    <Td>{row.agent.location}</Td>
                    <Td align="right" mono>{formatNumber(row.sales)}</Td>
                    <Td align="right" mono className="text-ok">{formatNaira(row.revenue, { compact: true })}</Td>
                  </Tr>
                ))}
              </tbody>
            </DataTable>
          </Panel>
        </div>

        <Panel>
          <PanelHeader title="Brand Assets" subtitle="Approved ACL lines — copy straight into a campaign" />
          <div className="grid gap-2 p-3 sm:grid-cols-2">
            {TAGLINES.map((line) => (
              <button
                key={line}
                onClick={() => copy(line)}
                className="group flex items-center justify-between gap-3 rounded-[3px] border border-hairline-strong bg-surface-2 px-3.5 py-3 text-left transition-colors hover:border-acl-red/50"
              >
                <span className="font-display text-[13px] font-extrabold uppercase tracking-[0.08em] text-ink">
                  {line}
                </span>
                {copied === line ? (
                  <Check className="h-4 w-4 shrink-0 text-ok" />
                ) : (
                  <Copy className="h-4 w-4 shrink-0 text-ink-4 group-hover:text-acl-red" />
                )}
              </button>
            ))}
          </div>
          <div className="border-t border-hairline p-4">
            <p className="acl-label mb-2">Event one-liner</p>
            <button
              onClick={() =>
                copy(
                  `${event.name} — ${formatDate(event.startsAt)}, ${event.venue}, ${event.location}. Tickets from ${formatNaira(
                    Math.min(...breakdown.map((b) => b.price)),
                  )}. ACL — Africa Combat League.`,
                )
              }
              className="w-full rounded-[3px] border border-hairline-strong bg-[#08090C] px-3.5 py-3 text-left text-[12.5px] leading-relaxed text-ink-2 transition-colors hover:border-acl-red/50"
            >
              {event.name} — {formatDate(event.startsAt)}, {event.venue}, {event.location}. Tickets from{" "}
              {formatNaira(Math.min(...breakdown.map((b) => b.price)))}. ACL — Africa Combat League.
            </button>
          </div>
        </Panel>
      </div>
    </>
  );
}

function Tile({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: string;
}) {
  return (
    <Panel className="p-3.5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className={`acl-stat text-[24px] leading-none ${tone}`}>{value}</p>
          <p className="acl-label mt-1.5 !text-[9.5px]">{label}</p>
        </div>
        <span className={tone}>{icon}</span>
      </div>
      <p className="mt-2 truncate text-[11px] text-ink-4">{sub}</p>
    </Panel>
  );
}
