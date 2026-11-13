import { z } from "zod";
import { route } from "@/server/api";
import { createTicketOrder } from "@/server/services/commerce";
import { audit } from "@/server/audit";

const body = z.object({
  eventId: z.string().min(1),
  items: z.array(z.object({ ticketTypeId: z.string().min(1), quantity: z.number().int().min(1).max(8) })).min(1, "Select at least one ticket").max(10),
  holderName: z.string().trim().max(80).optional(), promoCode: z.string().trim().max(40).nullish(),
});
export const POST = route({ auth: true, body, limit: 6 }, async ({ user, body }) => {
  const order = await createTicketOrder(user, body);
  await audit(user.id, "order", "order", order.id, `tickets ${order.number}`);
  return { id: order.id, number: order.number };
});
