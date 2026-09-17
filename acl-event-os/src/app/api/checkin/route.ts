import { getStore } from "@/lib/server/store";
import { ok, fail, handleError, requirePermission } from "@/lib/server/api";
import { scanSchema } from "@/lib/domain/schemas";

export const dynamic = "force-dynamic";

/**
 * The gate.
 *
 * The client posts whatever the camera decoded; it decides nothing. All
 * validation, the duplicate check and the atomic state transition happen in
 * the store, and only the outcome comes back.
 */
export async function POST(request: Request) {
  try {
    requirePermission(request, "checkin.scan");
    const input = scanSchema.parse(await request.json());
    const outcome = await getStore().checkIn(input);
    return ok(outcome, { status: outcome.result === "GRANTED" ? 200 : 200 });
  } catch (err) {
    return handleError(err);
  }
}

/** Manual lookup — inspect a ticket without admitting anyone. */
export async function GET(request: Request) {
  try {
    requirePermission(request, "checkin.view_log");
    const id = new URL(request.url).searchParams.get("ticketId");
    if (!id) return fail("Provide a ticket ID.");
    const store = getStore();
    const ticket = store.ticket(id);
    if (!ticket) return fail("No ticket exists with that reference.", 404);
    return ok({
      ticket,
      attendee: store.attendee(ticket.attendeeId) ?? null,
      payment: store.payment(ticket.paymentId) ?? null,
      history: store.checkIns().filter((c) => c.ticketId === ticket.id),
    });
  } catch (err) {
    return handleError(err);
  }
}
