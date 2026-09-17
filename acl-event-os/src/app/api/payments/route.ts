import { getStore } from "@/lib/server/store";
import { ok, handleError, paginate } from "@/lib/server/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const store = getStore();
    const query = (params.get("q") ?? "").trim().toLowerCase();
    const status = params.get("status");
    const method = params.get("method");

    let rows = store.payments().map((p) => ({
      ...p,
      agentName: p.agentId ? store.agents.find((a) => a.id === p.agentId)?.name ?? null : null,
      ticketType: store.ticket(p.ticketIds[0])?.type ?? null,
    }));

    if (query) {
      rows = rows.filter(
        (p) =>
          p.id.toLowerCase().includes(query) ||
          p.reference.toLowerCase().includes(query) ||
          p.customerName.toLowerCase().includes(query) ||
          p.ticketIds.some((t) => t.toLowerCase().includes(query)),
      );
    }
    if (status && status !== "ALL") rows = rows.filter((p) => p.status === status);
    if (method && method !== "ALL") rows = rows.filter((p) => p.method === method);

    rows.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return ok(paginate(rows, params));
  } catch (err) {
    return handleError(err);
  }
}
