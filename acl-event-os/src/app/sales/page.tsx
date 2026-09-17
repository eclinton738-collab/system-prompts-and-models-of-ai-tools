"use client";

import { useState } from "react";
import { Download, TrendingUp } from "lucide-react";
import { Guard } from "@/components/layout/Guard";
import { PageHeader } from "@/components/layout/AppShell";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { PaymentBadge } from "@/components/ui/Badge";
import { DataTable, Th, Td, Tr, EmptyState, TableSkeleton, Pagination } from "@/components/ui/Table";
import { SearchInput, FilterBar } from "@/components/ui/FilterBar";
import { SalesTrendChart, RevenueTrendChart, DistributionDonut, TierLegendDot, type TrendMode } from "@/components/charts/Charts";
import { RevenueTracker } from "@/components/dashboard/Panels";
import { useAcl } from "@/lib/client/provider";
import { useResource, useDebounced } from "@/lib/client/useResource";
import { downloadCsv } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";
import { TICKET_TYPES } from "@/lib/domain/catalog";
import { formatNaira, formatNumber, formatDateTime } from "@/lib/domain/format";
import type { Paged } from "@/lib/client/types";
import type { SalesChannel, Ticket } from "@/lib/domain/types";

const CHANNEL_FILTERS: Array<{ value: SalesChannel | "ALL"; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "WEBSITE", label: "Online" },
  { value: "POS_AGENT", label: "POS / Agents" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "USSD", label: "USSD" },
  { value: "CASH", label: "Cash" },
];

export default function SalesPage() {
  return (
    <Guard permission="sales.view">
      <Sales />
    </Guard>
  );
}

type Row = Ticket & { method: string; reference: string; phone: string };

function Sales() {
  const { state, allows } = useAcl();
  const toast = useToast();
  const [mode, setMode] = useState<TrendMode>("daily");
  const [channel, setChannel] = useState<SalesChannel | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(query);

  const params = new URLSearchParams({ page: String(page), size: "20" });
  if (channel !== "ALL") params.set("channel", channel);
  if (debounced) params.set("q", debounced);
  const { data, loading } = useResource<Paged<Row>>(`/api/tickets?${params}`);

  async function exportCsv() {
    try {
      await downloadCsv("/api/reports/ticket-sales?format=csv", `acl-ticket-sales-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.push({ tone: "success", title: "Export ready", body: "Ticket sales downloaded as CSV." });
    } catch (err) {
      toast.push({ tone: "error", title: "Export failed", body: err instanceof Error ? err.message : "" });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="ACL Sales & Revenue"
        title="Sales & Revenue"
        description="Ticket velocity, revenue against target, and the full sales ledger."
        actions={
          allows("reports.export") ? (
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          ) : null
        }
      />

      <div className="space-y-3 p-3 sm:p-4 lg:p-5">
        {state ? (
          <>
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Panel>
                  <PanelHeader
                    title="Ticket Sales Trend"
                    icon={<TrendingUp className="h-3.5 w-3.5" />}
                    subtitle="Tickets sold over the last 30 days"
                    action={
                      <Tabs
                        size="sm"
                        value={mode}
                        onChange={setMode}
                        options={[
                          { value: "daily", label: "Daily" },
                          { value: "weekly", label: "Weekly" },
                          { value: "cumulative", label: "Cumulative" },
                        ]}
                      />
                    }
                  />
                  <div className="p-3">
                    <SalesTrendChart
                      daily={state.trend.daily}
                      weekly={state.trend.weekly}
                      mode={mode}
                      capacity={state.event.capacity}
                    />
                  </div>
                </Panel>
              </div>
              <RevenueTracker
                revenue={state.stats.revenue}
                projected={state.stats.projectedRevenue}
                progress={state.stats.revenueProgress}
                paid={state.stats.paid}
                pending={state.stats.pending}
                refunded={state.stats.refunded}
                pendingValue={state.stats.pendingValue}
                refundedValue={state.stats.refundedValue}
              />
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Panel>
                  <PanelHeader title="Revenue Trend" subtitle="Settled revenue per day" />
                  <div className="p-3">
                    <RevenueTrendChart data={state.trend.daily} />
                  </div>
                </Panel>
              </div>
              <Panel>
                <PanelHeader title="Ticket Distribution" />
                <div className="p-4">
                  <DistributionDonut data={state.breakdown} total={state.stats.ticketsSold} />
                </div>
              </Panel>
            </div>
          </>
        ) : null}

        <Panel>
          <PanelHeader title="Ticket Sales Ledger" subtitle={data ? `${formatNumber(data.total)} matching tickets` : undefined} />
          <FilterBar>
            <Tabs
              size="sm"
              value={channel}
              onChange={(v) => {
                setChannel(v);
                setPage(1);
              }}
              options={CHANNEL_FILTERS}
            />
            <SearchInput
              value={query}
              onChange={(v) => {
                setQuery(v);
                setPage(1);
              }}
              placeholder="Ticket ID, name, phone…"
              className="ml-auto w-full sm:w-64"
              label="Search sales"
            />
          </FilterBar>

          {loading && !data ? (
            <TableSkeleton rows={8} cols={7} />
          ) : !data?.rows.length ? (
            <EmptyState
              title="No sales match"
              body="Adjust the channel filter or clear the search to see more."
            />
          ) : (
            <>
              <DataTable>
                <thead>
                  <tr>
                    <Th>Ticket ID</Th>
                    <Th>Name</Th>
                    <Th>Type</Th>
                    <Th align="right">Amount</Th>
                    <Th>Payment Method</Th>
                    <Th>Status</Th>
                    <Th align="right">Time</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <Tr key={row.id}>
                      <Td mono>{row.id}</Td>
                      <Td className="text-ink">{row.attendeeName}</Td>
                      <Td>
                        <span className="flex items-center gap-1.5">
                          <TierLegendDot type={row.type} />
                          {TICKET_TYPES[row.type].name}
                        </span>
                      </Td>
                      <Td align="right" mono>{formatNaira(row.price)}</Td>
                      <Td>{row.method.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</Td>
                      <Td>
                        <PaymentBadge status={row.paymentStatus} />
                      </Td>
                      <Td align="right" className="whitespace-nowrap text-ink-3">
                        {formatDateTime(row.purchasedAt)}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </DataTable>
              <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
            </>
          )}
        </Panel>
      </div>
    </>
  );
}
