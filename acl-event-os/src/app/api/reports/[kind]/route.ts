import { getStore } from "@/lib/server/store";
import { ok, fail, handleError, toCsv, requirePermission } from "@/lib/server/api";
import {
  breakdownByType, byPaymentMethod, checkInStats, agentPerformance, salesTrend, headlineStats,
} from "@/lib/domain/stats";
import { formatDateTime } from "@/lib/domain/format";

export const dynamic = "force-dynamic";

const KINDS = [
  "ticket-sales", "revenue", "payments", "check-in", "agent-performance",
  "ticket-type-performance", "security-events",
] as const;
type Kind = (typeof KINDS)[number];

function buildReport(kind: Kind): { title: string; rows: Array<Record<string, unknown>> } {
  const store = getStore();
  const tickets = store.tickets();
  const event = store.event;

  switch (kind) {
    case "ticket-sales":
      return {
        title: "Ticket Sales",
        rows: tickets
          .slice()
          .sort((a, b) => Date.parse(b.purchasedAt) - Date.parse(a.purchasedAt))
          .map((t) => ({
            ticket_id: t.id,
            name: t.attendeeName,
            type: t.type,
            amount_ngn: t.price,
            channel: t.channel,
            payment_method: store.payment(t.paymentId)?.method ?? "",
            payment_status: t.paymentStatus,
            ticket_status: t.status,
            agent_id: t.agentId ?? "",
            purchased_at: formatDateTime(t.purchasedAt),
          })),
      };
    case "revenue": {
      const daily = salesTrend(tickets, event.capacity, 30);
      return {
        title: "Revenue",
        rows: daily.map((d) => ({
          date: d.date,
          tickets_sold: d.sold,
          revenue_ngn: d.revenue,
          cumulative_tickets: d.cumulativeSold,
          cumulative_revenue_ngn: d.cumulativeRevenue,
          inventory_remaining: d.remaining,
        })),
      };
    }
    case "payments":
      return {
        title: "Payments",
        rows: store.payments().map((p) => ({
          transaction_id: p.id,
          reference: p.reference,
          ticket_ids: p.ticketIds.join(" | "),
          customer: p.customerName,
          amount_ngn: p.amount,
          method: p.method,
          status: p.status,
          agent_id: p.agentId ?? "",
          created_at: formatDateTime(p.createdAt),
          settled_at: p.settledAt ? formatDateTime(p.settledAt) : "",
          failure_reason: p.failureReason ?? "",
        })),
      };
    case "check-in":
      return {
        title: "Check-In",
        rows: store.checkIns().map((c) => ({
          ticket_id: c.ticketId,
          name: c.attendeeName,
          ticket_type: c.ticketType,
          gate: c.gateName,
          operator: c.operatorName,
          device: c.deviceId,
          scanned_at: formatDateTime(c.scannedAt),
          result: c.result,
          reason: c.reason ?? "",
          duration_ms: c.durationMs,
        })),
      };
    case "agent-performance":
      return {
        title: "Agent Performance",
        rows: agentPerformance(store.agents, tickets).map((a) => ({
          agent_id: a.agent.id,
          name: a.agent.name,
          phone: a.agent.phone,
          location: a.agent.location,
          status: a.agent.status,
          tickets_sold: a.sales,
          revenue_ngn: a.revenue,
          commission_rate: `${(a.agent.commissionRate * 100).toFixed(1)}%`,
          commission_ngn: a.commission,
          checked_in: a.checkedIn,
        })),
      };
    case "ticket-type-performance":
      return {
        title: "Ticket Type Performance",
        rows: breakdownByType(tickets).map((b) => ({
          type: b.name,
          price_ngn: b.price,
          allocation: b.allocation,
          sold: b.sold,
          remaining: b.remaining,
          revenue_ngn: b.revenue,
          checked_in: b.checkedIn,
          share_percent: b.share.toFixed(1),
        })),
      };
    case "security-events":
      return {
        title: "Security Events",
        rows: store.securityEvents.map((s) => ({
          at: formatDateTime(s.at),
          kind: s.kind,
          severity: s.severity,
          ticket_id: s.ticketId,
          gate: s.gateName,
          operator: s.operatorName,
          device: s.deviceId,
          result: s.result,
          detail: s.detail,
          first_scan_at: s.firstScanAt ? formatDateTime(s.firstScanAt) : "",
          first_scan_gate: s.firstScanGate ?? "",
        })),
      };
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  try {
    requirePermission(request, "reports.view");
    const { kind } = await params;
    if (!KINDS.includes(kind as Kind)) return fail("Unknown report.", 404);
    const report = buildReport(kind as Kind);
    const format = new URL(request.url).searchParams.get("format");

    if (format === "csv") {
      requirePermission(request, "reports.export");
      const store = getStore();
      const stamp = new Date().toISOString().slice(0, 10);
      return new Response(toCsv(report.rows), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="acl-${kind}-${stamp}.csv"`,
          "X-Acl-Event": store.event.name,
        },
      });
    }

    const store = getStore();
    return ok({
      kind,
      title: report.title,
      rows: report.rows,
      generatedAt: new Date().toISOString(),
      event: { name: store.event.name, startsAt: store.event.startsAt, venue: store.event.venue, location: store.event.location },
      summary: headlineStats(store.tickets(), store.checkIns(), store.event),
      methods: byPaymentMethod(store.payments()),
      checkIn: checkInStats(store.checkIns()),
    });
  } catch (err) {
    return handleError(err);
  }
}
