"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { Guard } from "@/components/layout/Guard";
import { PageHeader } from "@/components/layout/AppShell";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge, ResultBadge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable, Th, Td, Tr, EmptyState, TableSkeleton, Pagination } from "@/components/ui/Table";
import { SearchInput, FilterBar } from "@/components/ui/FilterBar";
import { Select } from "@/components/ui/Field";
import { useAcl } from "@/lib/client/provider";
import { useResource, useDebounced } from "@/lib/client/useResource";
import { downloadCsv } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";
import { TICKET_TYPES } from "@/lib/domain/catalog";
import { formatDateTime, formatNumber } from "@/lib/domain/format";
import type { Paged } from "@/lib/client/types";
import type { CheckIn } from "@/lib/domain/types";

const FILTERS = [
  { value: "ALL", label: "All" },
  { value: "GRANTED", label: "Granted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "DUPLICATE", label: "Duplicate" },
  { value: "INVALID", label: "Invalid" },
  { value: "PENDING_PAYMENT", label: "Pending Payment" },
] as const;

export default function CheckInLogPage() {
  return (
    <Guard permission="checkin.view_log">
      <CheckInLog />
    </Guard>
  );
}

function CheckInLog() {
  const { state, allows } = useAcl();
  const toast = useToast();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("ALL");
  const [gate, setGate] = useState("ALL");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(query);

  const params = new URLSearchParams({ page: String(page), size: "25", filter });
  if (gate !== "ALL") params.set("gate", gate);
  if (debounced) params.set("q", debounced);
  const { data, loading } = useResource<Paged<CheckIn & { phone: string }>>(`/api/checkins?${params}`);

  async function exportCsv() {
    try {
      await downloadCsv("/api/reports/check-in?format=csv", `acl-check-in-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.push({ tone: "success", title: "Export ready", body: "Check-in log downloaded as CSV." });
    } catch (err) {
      toast.push({ tone: "error", title: "Export failed", body: err instanceof Error ? err.message : "" });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="ACL Gate Control"
        title="Check-In Log"
        description="Every scan ever presented at a gate — admitted or refused — with the reason, gate, operator and device that handled it."
        actions={
          <>
            <Link
              href="/check-in"
              className="flex items-center gap-2 rounded-[3px] border border-hairline-strong bg-surface-2 px-3.5 py-2 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-ink-2 transition-colors hover:border-acl-red/50 hover:text-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Scanner
            </Link>
            {allows("reports.export") ? (
              <Button variant="outline" onClick={exportCsv}>
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            ) : null}
          </>
        }
      />

      <div className="p-3 sm:p-4 lg:p-5">
        <Panel>
          <PanelHeader
            title="Audit Trail"
            subtitle={data ? `${formatNumber(data.total)} scans recorded` : undefined}
          />
          <FilterBar>
            <Tabs
              size="sm"
              value={filter}
              onChange={(v) => {
                setFilter(v);
                setPage(1);
              }}
              options={FILTERS as never}
            />
            <Select
              value={gate}
              onChange={(e) => {
                setGate(e.target.value);
                setPage(1);
              }}
              className="h-8 w-auto text-[11.5px]"
              aria-label="Filter by gate"
            >
              <option value="ALL">All gates</option>
              {(state?.gates ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
            <SearchInput
              value={query}
              onChange={(v) => {
                setQuery(v);
                setPage(1);
              }}
              placeholder="Ticket ID, name, phone…"
              className="ml-auto w-full sm:w-64"
              label="Search check-in log"
            />
          </FilterBar>

          {loading && !data ? (
            <TableSkeleton rows={10} cols={8} />
          ) : !data?.rows.length ? (
            <EmptyState title="No scans match" body="Change the filter or clear the search to see more of the log." />
          ) : (
            <>
              <DataTable>
                <thead>
                  <tr>
                    <Th>Ticket ID</Th>
                    <Th>Name</Th>
                    <Th>Type</Th>
                    <Th>Gate</Th>
                    <Th>Operator</Th>
                    <Th>Device</Th>
                    <Th align="right">Time</Th>
                    <Th>Result</Th>
                    <Th>Reason</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <Tr key={row.id} className={row.reason === "ALREADY_USED" ? "bg-danger/[0.05]" : undefined}>
                      <Td mono>{row.ticketId}</Td>
                      <Td className="text-ink">{row.attendeeName}</Td>
                      <Td>{row.ticketType === "UNKNOWN" ? "—" : TICKET_TYPES[row.ticketType].name}</Td>
                      <Td>{row.gateName}</Td>
                      <Td>{row.operatorName}</Td>
                      <Td mono className="text-ink-3">{row.deviceId}</Td>
                      <Td align="right" className="whitespace-nowrap text-ink-3">{formatDateTime(row.scannedAt)}</Td>
                      <Td>
                        <ResultBadge result={row.result} />
                      </Td>
                      <Td>
                        {row.reason ? (
                          <Badge tone={row.reason === "ALREADY_USED" ? "danger" : "neutral"}>
                            {row.reason.replace(/_/g, " ")}
                          </Badge>
                        ) : (
                          <span className="text-ink-4">—</span>
                        )}
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
