"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Users } from "lucide-react";
import { Guard } from "@/components/layout/Guard";
import { PageHeader } from "@/components/layout/AppShell";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge, PaymentBadge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Select } from "@/components/ui/Field";
import { DataTable, Th, Td, Tr, EmptyState, TableSkeleton, Pagination } from "@/components/ui/Table";
import { SearchInput, FilterBar } from "@/components/ui/FilterBar";
import { AttendeeDrawer } from "@/components/attendees/AttendeeDrawer";
import { TierLegendDot } from "@/components/charts/Charts";
import { useResource, useDebounced } from "@/lib/client/useResource";
import { useAcl } from "@/lib/client/provider";
import { downloadCsv } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";
import { TICKET_TYPES, TICKET_TYPE_LIST } from "@/lib/domain/catalog";
import { formatNaira, formatDateTime, formatNumber } from "@/lib/domain/format";
import type { Paged } from "@/lib/client/types";
import type { PaymentStatus, TicketTypeCode } from "@/lib/domain/types";

interface AttendeeRow {
  attendeeId: string;
  name: string;
  phone: string;
  email: string;
  ticketId: string;
  type: TicketTypeCode;
  price: number;
  paymentStatus: PaymentStatus;
  ticketStatus: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  purchasedAt: string;
}

export default function AttendeesPage() {
  return (
    <Guard permission="attendees.view">
      <Suspense fallback={null}>
        <Attendees />
      </Suspense>
    </Guard>
  );
}

function Attendees() {
  const searchParams = useSearchParams();
  const { allows } = useAcl();
  const toast = useToast();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [payment, setPayment] = useState<PaymentStatus | "ALL">("ALL");
  const [presence, setPresence] = useState<"ALL" | "IN" | "OUT">("ALL");
  const [type, setType] = useState<TicketTypeCode | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const debounced = useDebounced(query);

  const params = new URLSearchParams({ page: String(page), size: "25" });
  if (debounced) params.set("q", debounced);
  if (payment !== "ALL") params.set("payment", payment);
  if (presence !== "ALL") params.set("presence", presence);
  if (type !== "ALL") params.set("type", type);
  const { data, loading } = useResource<Paged<AttendeeRow>>(`/api/attendees?${params}`);

  async function exportCsv() {
    try {
      await downloadCsv("/api/reports/ticket-sales?format=csv", `acl-attendees-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.push({ tone: "success", title: "Export ready", body: "Attendee list downloaded as CSV." });
    } catch (err) {
      toast.push({ tone: "error", title: "Export failed", body: err instanceof Error ? err.message : "" });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="ACL Attendees"
        title="Attendee Management"
        description="Every ticket holder for Lion's Den, with payment state, gate status and the actions to service them."
        actions={
          allows("reports.export") ? (
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          ) : null
        }
      />

      <div className="p-3 sm:p-4 lg:p-5">
        <Panel>
          <PanelHeader
            title="Attendees"
            icon={<Users className="h-3.5 w-3.5" />}
            subtitle={data ? `${formatNumber(data.total)} matching records` : undefined}
          />
          <FilterBar>
            <Tabs
              size="sm"
              value={presence}
              onChange={(v) => {
                setPresence(v);
                setPage(1);
              }}
              options={[
                { value: "ALL", label: "All" },
                { value: "IN", label: "Checked In" },
                { value: "OUT", label: "Not In" },
              ]}
            />
            <Select
              value={payment}
              onChange={(e) => {
                setPayment(e.target.value as PaymentStatus | "ALL");
                setPage(1);
              }}
              className="h-8 w-auto text-[11.5px]"
              aria-label="Filter by payment status"
            >
              <option value="ALL">All payments</option>
              {(["PAID", "PENDING", "FAILED", "REFUNDED"] as const).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select
              value={type}
              onChange={(e) => {
                setType(e.target.value as TicketTypeCode | "ALL");
                setPage(1);
              }}
              className="h-8 w-auto text-[11.5px]"
              aria-label="Filter by ticket type"
            >
              <option value="ALL">All tiers</option>
              {TICKET_TYPE_LIST.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name}
                </option>
              ))}
            </Select>
            <SearchInput
              value={query}
              onChange={(v) => {
                setQuery(v);
                setPage(1);
              }}
              placeholder="Name, phone, email, ticket ID…"
              className="ml-auto w-full sm:w-72"
              label="Search attendees"
            />
          </FilterBar>

          {loading && !data ? (
            <TableSkeleton rows={10} cols={7} />
          ) : !data?.rows.length ? (
            <EmptyState
              title="No attendees match"
              body="Try a different filter, or search by ticket ID, name, phone or email."
              icon={<Users className="h-5 w-5" />}
            />
          ) : (
            <>
              <DataTable>
                <thead>
                  <tr>
                    <Th>Name</Th>
                    <Th>Phone</Th>
                    <Th>Ticket</Th>
                    <Th>Type</Th>
                    <Th align="right">Amount</Th>
                    <Th>Payment</Th>
                    <Th>Check-In</Th>
                    <Th align="right">Purchased</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <Tr key={row.ticketId} onClick={() => setSelected(row.ticketId)}>
                      <Td className="text-ink">{row.name}</Td>
                      <Td mono className="text-ink-3">{row.phone}</Td>
                      <Td mono>{row.ticketId}</Td>
                      <Td>
                        <span className="flex items-center gap-1.5">
                          <TierLegendDot type={row.type} />
                          {TICKET_TYPES[row.type].name}
                        </span>
                      </Td>
                      <Td align="right" mono>{formatNaira(row.price)}</Td>
                      <Td>
                        <PaymentBadge status={row.paymentStatus} />
                      </Td>
                      <Td>
                        {row.checkedIn ? (
                          <Badge tone="ok" dot>
                            In
                          </Badge>
                        ) : row.ticketStatus === "SUSPENDED" ? (
                          <Badge tone="danger">Suspended</Badge>
                        ) : (
                          <Badge tone="neutral">Awaiting</Badge>
                        )}
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

      <AttendeeDrawer ticketId={selected} onClose={() => setSelected(null)} />
    </>
  );
}
