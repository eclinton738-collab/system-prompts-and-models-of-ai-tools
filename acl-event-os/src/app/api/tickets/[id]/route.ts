import { getStore } from "@/lib/server/store";
import { ok, fail, handleError } from "@/lib/server/api";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getStore();
    const ticket = store.ticket(id);
    if (!ticket) return fail("Ticket not found.", 404);
    return ok({
      ticket,
      attendee: store.attendee(ticket.attendeeId) ?? null,
      payment: store.payment(ticket.paymentId) ?? null,
      history: store.checkIns().filter((c) => c.ticketId === ticket.id),
      qr: store.qrToken(ticket.id),
    });
  } catch (err) {
    return handleError(err);
  }
}
