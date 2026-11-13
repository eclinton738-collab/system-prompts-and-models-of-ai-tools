import { z } from "zod";
import { route } from "@/server/api";
import { createShopOrder } from "@/server/services/commerce";
import { audit } from "@/server/audit";

const req = (label: string, max = 160) => z.string({ invalid_type_error: `${label} is required`, required_error: `${label} is required` }).trim().min(2, `${label} is required`).max(max);
const body = z.object({
  items: z.array(z.object({ productId: z.string().min(1), size: z.string().max(8).nullish(), quantity: z.number().int().min(1).max(10) })).min(1, "Your cart is empty").max(30),
  promoCode: z.string().trim().max(40).nullish(),
  shippingName: req("Name"), shippingAddress: req("Address", 300), shippingCity: req("City"), shippingCountry: req("Country"), phone: req("Phone", 40),
});
export const POST = route({ auth: true, body, limit: 6 }, async ({ user, body }) => {
  const order = await createShopOrder(user, body);
  await audit(user.id, "order", "order", order.id, `shop ${order.number}`);
  return { id: order.id, number: order.number };
});
