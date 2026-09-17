import { getStore } from "@/lib/server/store";
import { ok, handleError, paginate, requirePermission, actorFrom } from "@/lib/server/api";
import { purchaseSchema } from "@/lib/domain/schemas";
import { TICKET_TYPES } from "@/lib/domain/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const params = url.searchParams;
    const store = getStore();
    const query = (params.get("q") ?? "").trim().toLowerCase();
    const type = params.get("type");
    const status = params.get("status");
    const channel = params.get("channel");
    const checkedIn = params.get("checkedIn");

    let rows = store.tickets().map((t) => {
      const attendee = store.attendee(t.attendeeId);
      return {
        ...t,
        method: store.payment(t.paymentId)?.method ?? "CARD",
        reference: store.payment(t.paymentId)?.reference ?? "",
        phone: attendee?.phone ?? "",
        email: attendee?.email ?? "",
      };
    });

    if (query) {
      rows = rows.filter(
        (t) =>
          t.id.toLowerCase().includes(query) ||
          t.attendeeName.toLowerCase().includes(query) ||
          t.phone.toLowerCase().includes(query) ||
          t.email.toLowerCase().includes(query),
      );
    }
    if (type && type !== "ALL") rows = rows.filter((t) => t.type === type);
    if (status && status !== "ALL") rows = rows.filter((t) => t.paymentStatus === status);
    if (channel && channel !== "ALL") rows = rows.filter((t) => t.channel === channel);
    if (checkedIn === "IN") rows = rows.filter((t) => t.status === "USED");
    if (checkedIn === "OUT") rows = rows.filter((t) => t.status !== "USED");

    rows.sort((a, b) => Date.parse(b.purchasedAt) - Date.parse(a.purchasedAt));
    return ok(paginate(rows, params));
  } catch (err) {
    return handleError(err);
  }
}

/** Sell tickets. Ticket IDs are minted server-side — never supplied by a caller. */
export async function POST(request: Request) {
  try {
    requirePermission(request, "ticketing.sell");
    const { role } = actorFrom(request);
    const input = purchaseSchema.parse(await request.json());
    const store = getStore();

    // An agent may only sell against their own agent ID.
    const agentId = role === "TICKET_AGENT" ? input.agentId ?? "AGT-001" : input.agentId;

    const { payment, tickets } = store.sell({
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
      type: input.type,
      quantity: input.quantity,
      method: input.method,
      agentId,
    });

    return ok(
      {
        payment,
        tickets: tickets.map((t) => ({ ...t, qr: store.qrToken(t.id) })),
        typeName: TICKET_TYPES[input.type].name,
      },
      { status: 201 },
    );
  } catch (err) {
    return handleError(err);
  }
}
