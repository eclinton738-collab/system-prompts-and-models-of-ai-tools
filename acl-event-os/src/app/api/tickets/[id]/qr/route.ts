import { getStore } from "@/lib/server/store";
import { ok, fail, handleError } from "@/lib/server/api";

export const dynamic = "force-dynamic";

/** The signed payload that goes into the ticket's QR image. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getStore();
    const ticket = store.ticket(id);
    if (!ticket) return fail("Ticket not found.", 404);
    return ok({ ticketId: ticket.id, token: store.qrToken(ticket.id) });
  } catch (err) {
    return handleError(err);
  }
}
