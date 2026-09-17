"use client";

import { useState } from "react";
import { CreditCard, Download } from "lucide-react";
import { Guard } from "@/components/layout/Guard";
import { PageHeader } from "@/components/layout/AppShell";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { PaymentBadge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { DataTable, Th, Td, Tr, EmptyState, TableSkeleton, Pagination } from "@/components/ui/Table";
import { SearchInput, FilterBar } from "@/components/ui/FilterBar";
import { SliceDonut } from "@/components/charts/Charts";
import { useAcl } from "@/lib/client/provider";
import { useResource, useDebounced } from "@/lib/client/useResource";
import { downloadCsv } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";
import { formatNaira, formatDateTime, formatNumber } from "@/lib/domain/format";
import type { Paged } from "@/lib/client/types";
import type { Payment, PaymentMethod, PaymentStatus } from "@/lib/domain/types";

type Row = Payment & { agentName: string | null; ticketType: string | null };

export default function PaymentsPage() {
  return (
    <Guard permission="payments.view">
      <Payments />
    </Guard>
  );
}

function Payments() {
  const { state, allows } = useAcl();
  const toast = useToast();
  const [status, setStatus] = useState<PaymentStatus | "ALL">("ALL");
  const [method, setMethod] = useState<PaymentMethod | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Row | null>(null);
  const debounced = useDebounced(query);

  const params = new URLSearchParams({ page: String(page), size: "25" });
  if (status !== "ALL") params.set("status", status);
  if (method !== "ALL") params.set("method", method);
  if (debounced) params.set("q", debounced);
  const { data, loading } = useResource<Paged<Row>>(`/api/payments?${params}`);

  async function exportCsv() {
    try {
      await downloadCsv("/api/reports/payments?format=csv", `acl-payments-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.push({ tone: "success", title: "Export ready", body: "Payments downloaded as CSV." });
    } catch (err) {
      toast.push({ tone: "error", title: "Export failed", body: err instanceof Error ? err.message : "" });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="ACL Finance"
        title="Payments"
        description="Every transaction against the event — card, transfer, USSD, POS and cash — with settlement state and reference."
        actions={
          allows("reports.export") ? (
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          ) : null
        }
      />

      <div className="space-y-3 p-3 sm:p-4 lg:p-5">
        {state ? (
          <div className="grid gap-3 lg:grid-cols-3">
            <Panel className="p-4">
              <p className="acl-label">Settled revenue</p>
              <p className="acl-stat mt-1.5 text-[30px] leading-none text-ok">{formatNaira(state.stats.revenue)}</p>
              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-hairline pt-3">
                <div>
                  <dt className="acl-label !text-[8.5px]">Pending</dt>
                  <dd className="mt-1 font-mono text-[13px] text-warn">{formatNaira(state.stats.pendingValue, { compact: true })}</dd>
                </div>
                <div>
                  <dt className="acl-label !text-[8.5px]">Failed</dt>
                  <dd className="mt-1 font-mono text-[13px] text-danger">{formatNumber(state.stats.failed)}</dd>
                </div>
                <div>
                  <dt className="acl-label !text-[8.5px]">Refunded</dt>
                  <dd className="mt-1 font-mono text-[13px] text-ink-3">{formatNaira(state.stats.refundedValue, { compact: true })}</dd>
                </div>
              </dl>
            </Panel>
            <Panel>
              <PanelHeader title="Payment Methods" />
              <div className="p-4">
                <SliceDonut slices={state.methods} total={state.methods.reduce((s, m) => s + m.value, 0)} centreLabel="Txns" />
              </div>
            </Panel>
            <Panel>
              <PanelHeader title="Settlement Status" />
              <div className="p-4">
                <SliceDonut slices={state.paymentStatus} total={state.stats.ticketsSold} centreLabel="Tickets" />
              </div>
            </Panel>
          </div>
        ) : null}

        <Panel>
          <PanelHeader
            title="Transactions"
            icon={<CreditCard className="h-3.5 w-3.5" />}
            subtitle={data ? `${formatNumber(data.total)} records` : undefined}
          />
          <FilterBar>
            <Tabs
              size="sm"
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              options={[
                { value: "ALL", label: "All" },
                { value: "PAID", label: "Paid" },
                { value: "PENDING", label: "Pending" },
                { value: "FAILED", label: "Failed" },
                { value: "REFUNDED", label: "Refunded" },
              ]}
            />
            <Select
              value={method}
              onChange={(e) => {
                setMethod(e.target.value as PaymentMethod | "ALL");
                setPage(1);
              }}
              className="h-8 w-auto text-[11.5px]"
              aria-label="Filter by method"
            >
              <option value="ALL">All methods</option>
              {(["CARD", "BANK_TRANSFER", "USSD", "POS_AGENT", "CASH_OUTLET"] as const).map((m) => (
                <option key={m} value={m}>
                  {m.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
            <SearchInput
              value={query}
              onChange={(v) => {
                setQuery(v);
                setPage(1);
              }}
              placeholder="Transaction, reference, customer…"
              className="ml-auto w-full sm:w-72"
              label="Search payments"
            />
          </FilterBar>

          {loading && !data ? (
            <TableSkeleton rows={10} cols={7} />
          ) : !data?.rows.length ? (
            <EmptyState title="No transactions match" body="Adjust the filters to widen the search." icon={<CreditCard className="h-5 w-5" />} />
          ) : (
            <>
              <DataTable>
                <thead>
                  <tr>
                    <Th>Transaction ID</Th>
                    <Th>Ticket</Th>
                    <Th>Customer</Th>
                    <Th align="right">Amount</Th>
                    <Th>Method</Th>
                    <Th>Status</Th>
                    <Th>Reference</Th>
                    <Th align="right">Date</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <Tr key={row.id} onClick={() => setDetail(row)}>
                      <Td mono>{row.id}</Td>
                      <Td mono className="text-ink-3">{row.ticketIds.join(", ")}</Td>
                      <Td className="text-ink">{row.customerName}</Td>
                      <Td align="right" mono>{formatNaira(row.amount)}</Td>
                      <Td>{row.method.replace(/_/g, " ")}</Td>
                      <Td>
                        <PaymentBadge status={row.status} />
                      </Td>
                      <Td mono className="text-ink-4">{row.reference}</Td>
                      <Td align="right" className="whitespace-nowrap text-ink-3">{formatDateTime(row.createdAt)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </DataTable>
              <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
            </>
          )}
        </Panel>
      </div>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.id ?? "Transaction"}
        subtitle={detail?.reference}
        size="md"
      >
        {detail ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-[3px] border border-hairline-strong bg-surface-2 px-4 py-3">
              <div>
                <p className="acl-label !text-[9px]">Amount</p>
                <p className="acl-stat mt-1 text-[26px] leading-none text-ink">{formatNaira(detail.amount)}</p>
              </div>
              <PaymentBadge status={detail.status} />
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Item label="Customer" value={detail.customerName} />
              <Item label="Ticket(s)" value={detail.ticketIds.join(", ")} mono />
              <Item label="Method" value={detail.method.replace(/_/g, " ")} />
              <Item label="Reference" value={detail.reference} mono />
              <Item label="Created" value={formatDateTime(detail.createdAt)} />
              <Item label="Settled" value={detail.settledAt ? formatDateTime(detail.settledAt) : "—"} />
              <Item label="Agent" value={detail.agentName ?? "Direct"} />
              <Item label="Provider ref" value={detail.providerRef ?? "—"} mono />
            </dl>
            {detail.failureReason ? (
              <p className="rounded-[3px] border border-danger/40 bg-danger/10 px-3 py-2 text-[12px] text-danger">
                Failure reason: {detail.failureReason}
              </p>
            ) : null}
            {detail.refundedAt ? (
              <p className="rounded-[3px] border border-hairline-strong bg-surface-2 px-3 py-2 text-[12px] text-ink-2">
                Refunded {formatDateTime(detail.refundedAt)}.
              </p>
            ) : null}
            <p className="text-[11px] leading-relaxed text-ink-4">
              Settlement is recorded against the ACL payment provider adapter. Card, USSD and transfer rails each
              implement the same interface, so switching provider does not change this record.
            </p>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

function Item({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="acl-label !text-[8.5px]">{label}</dt>
      <dd className={`mt-0.5 truncate text-[12.5px] text-ink ${mono ? "font-mono text-[12px]" : ""}`}>{value}</dd>
    </div>
  );
}
