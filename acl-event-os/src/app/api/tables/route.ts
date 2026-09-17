import { getStore } from "@/lib/server/store";
import { ok, handleError, requirePermission } from "@/lib/server/api";
import { tableBookingSchema } from "@/lib/domain/schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(getStore().tables);
}

/** Book a table: creates the buyer, the payment and the table's ticket. */
export async function POST(request: Request) {
  try {
    requirePermission(request, "ticketing.sell");
    const input = tableBookingSchema.parse(await request.json());
    const store = getStore();
    const table = store.tables.find((t) => t.id === input.tableId);
    if (!table) return ok({ error: "Table not found" }, { status: 404 });

    const { payment, tickets } = store.sell({
      fullName: input.buyerName,
      phone: input.buyerPhone,
      email: input.buyerEmail,
      type: table.type,
      quantity: 1,
      method: input.method,
      tableId: table.id,
      guests: input.guests,
    });
    return ok({ payment, ticket: tickets[0], qr: store.qrToken(tickets[0].id), table }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
