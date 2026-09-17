import { getStore } from "@/lib/server/store";
import { ok, handleError, requirePermission } from "@/lib/server/api";
import { settingsSchema } from "@/lib/domain/schemas";
import { TICKET_TYPE_LIST } from "@/lib/domain/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = getStore();
  return ok({
    event: store.event,
    ticketTypes: TICKET_TYPE_LIST,
    users: store.users,
  });
}

export async function PATCH(request: Request) {
  try {
    requirePermission(request, "settings.edit");
    const input = settingsSchema.parse(await request.json());
    const event = getStore().updateEvent({
      name: input.name,
      startsAt: new Date(input.startsAt).toISOString(),
      venue: input.venue,
      location: input.location,
      capacity: input.capacity,
      projectedRevenue: input.projectedRevenue,
      status: input.status,
      refundPolicy: input.refundPolicy,
      rules: input.rules,
      prices: input.prices,
    });
    return ok(event);
  } catch (err) {
    return handleError(err);
  }
}
