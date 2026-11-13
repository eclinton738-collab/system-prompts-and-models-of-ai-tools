import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "../db";
import { ApiError } from "../api";
import { getPaymentProvider } from "../integrations/payments";
import { awardPoints, evaluateBadges } from "./engagement";
import { track } from "./analytics";

const orderNumber = () => `ACL-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
const ticketCode = () => `ACLT-${randomBytes(9).toString("base64url").toUpperCase()}`;

export async function resolvePromo(code: string | undefined | null) {
  if (!code) return null;
  const promo = await db.promoCode.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!promo || !promo.active) throw new ApiError(422, "promo_invalid", "That promo code is not valid.", { promoCode: "Invalid code" });
  if (promo.expiresAt && promo.expiresAt < new Date()) throw new ApiError(422, "promo_expired", "That promo code has expired.", { promoCode: "Expired" });
  if (promo.maxUses != null && promo.uses >= promo.maxUses) throw new ApiError(422, "promo_used", "That promo code has been fully redeemed.", { promoCode: "Fully redeemed" });
  return promo;
}

async function usdMinor(minor: number, currency: string) {
  const c = await db.currency.findUnique({ where: { code: currency } });
  return Math.round(minor / (c?.perUsd ?? 1));
}

type Shipping = { shippingName: string; shippingAddress: string; shippingCity: string; shippingCountry: string; phone: string };

export async function createShopOrder(user: { id: string; email: string }, input: { items: { productId: string; size?: string | null; quantity: number }[]; promoCode?: string | null } & Shipping) {
  const products = await db.product.findMany({ where: { id: { in: input.items.map((i) => i.productId) }, active: true } });
  if (!input.items.length) throw new ApiError(422, "empty_cart", "Your cart is empty.");
  const lines = input.items.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product) throw new ApiError(422, "unavailable", "An item in your cart is no longer available.");
    if (product.sizes.length && !product.sizes.includes(item.size ?? "")) throw new ApiError(422, "size", `Choose a size for ${product.name}.`);
    if (product.inventory < item.quantity) throw new ApiError(409, "out_of_stock", `Only ${product.inventory} left of ${product.name}.`);
    return { product, size: item.size ?? null, quantity: item.quantity };
  });
  const currency = lines[0].product.currency;
  if (lines.some((l) => l.product.currency !== currency)) throw new ApiError(422, "mixed_currency", "Items priced in different currencies must be ordered separately.");
  const subtotal = lines.reduce((n, l) => n + l.product.priceMinor * l.quantity, 0);
  const promo = await resolvePromo(input.promoCode);
  const discount = promo ? Math.round((subtotal * promo.percentOff) / 100) : 0;
  const total = subtotal - discount;

  const number = orderNumber();
  const provider = getPaymentProvider();
  const charge = await provider.charge({ orderNumber: number, amountMinor: total, currency, email: user.email, description: `ACL Shop order ${number}` });
  if (charge.status !== "succeeded") throw new ApiError(402, "payment_failed", charge.message ?? "Payment was declined.");

  const order = await db.$transaction(async (tx) => {
    for (const l of lines) {
      // Guarded decrement prevents overselling under concurrency.
      const res = await tx.product.updateMany({ where: { id: l.product.id, inventory: { gte: l.quantity } }, data: { inventory: { decrement: l.quantity } } });
      if (!res.count) throw new ApiError(409, "out_of_stock", `${l.product.name} just sold out.`);
    }
    if (promo) await tx.promoCode.update({ where: { code: promo.code }, data: { uses: { increment: 1 } } });
    return tx.order.create({
      data: {
        number, userId: user.id, kind: "SHOP", status: "PAID", currency, subtotalMinor: subtotal, discountMinor: discount, totalMinor: total,
        promoCode: promo?.code, paymentProvider: provider.name, paymentRef: charge.reference,
        shippingName: input.shippingName, shippingAddress: input.shippingAddress, shippingCity: input.shippingCity, shippingCountry: input.shippingCountry, phone: input.phone,
        items: { create: lines.map((l) => ({ productId: l.product.id, description: l.product.name, size: l.size, quantity: l.quantity, unitMinor: l.product.priceMinor })) },
      },
    });
  });
  await awardPoints(user.id, "BUY_MERCH", order.id);
  await track({ type: "merch_purchase", userId: user.id, entityType: "order", entityId: order.id, valueMinor: await usdMinor(total, currency) });
  return order;
}

export async function createTicketOrder(user: { id: string; email: string; name: string }, input: { eventId: string; items: { ticketTypeId: string; quantity: number }[]; holderName?: string; phone?: string; promoCode?: string | null }) {
  const event = await db.event.findUnique({ where: { id: input.eventId } });
  if (!event || event.status === "CANCELLED" || event.status === "COMPLETED") throw new ApiError(409, "closed", "Ticket sales are closed for this event.");
  const types = await db.ticketType.findMany({ where: { eventId: event.id, id: { in: input.items.map((i) => i.ticketTypeId) } }, include: { _count: { select: { tickets: true } } } });
  const lines = input.items.filter((i) => i.quantity > 0).map((item) => {
    const type = types.find((t) => t.id === item.ticketTypeId);
    if (!type || !type.salesOpen) throw new ApiError(422, "unavailable", "A selected ticket category is not on sale.");
    if (type._count.tickets + item.quantity > type.capacity) throw new ApiError(409, "sold_out", `Not enough ${type.name} tickets remaining.`);
    return { type, quantity: item.quantity };
  });
  if (!lines.length) throw new ApiError(422, "empty", "Select at least one ticket.");
  const currency = lines[0].type.currency;
  const subtotal = lines.reduce((n, l) => n + l.type.priceMinor * l.quantity, 0);
  const promo = await resolvePromo(input.promoCode);
  const discount = promo ? Math.round((subtotal * promo.percentOff) / 100) : 0;
  const total = subtotal - discount;

  const number = orderNumber();
  const provider = getPaymentProvider();
  const charge = await provider.charge({ orderNumber: number, amountMinor: total, currency, email: user.email, description: `${event.name} tickets` });
  if (charge.status !== "succeeded") throw new ApiError(402, "payment_failed", charge.message ?? "Payment was declined.");

  const order = await db.$transaction(async (tx) => {
    for (const l of lines) {
      const sold = await tx.ticket.count({ where: { ticketTypeId: l.type.id } });
      if (sold + l.quantity > l.type.capacity) throw new ApiError(409, "sold_out", `${l.type.name} just sold out.`);
    }
    if (promo) await tx.promoCode.update({ where: { code: promo.code }, data: { uses: { increment: 1 } } });
    return tx.order.create({
      data: {
        number, userId: user.id, kind: "TICKETS", status: "PAID", currency, subtotalMinor: subtotal, discountMinor: discount, totalMinor: total,
        promoCode: promo?.code, paymentProvider: provider.name, paymentRef: charge.reference, phone: input.phone,
        items: { create: lines.map((l) => ({ ticketTypeId: l.type.id, description: `${event.name} — ${l.type.name}`, quantity: l.quantity, unitMinor: l.type.priceMinor })) },
        tickets: { create: lines.flatMap((l) => Array.from({ length: l.quantity }, () => ({ code: ticketCode(), ticketTypeId: l.type.id, userId: user.id, holderName: input.holderName || user.name }))) },
      },
    });
  });
  await awardPoints(user.id, "BUY_TICKET", order.id);
  await evaluateBadges(user.id);
  await db.notification.create({ data: { userId: user.id, type: "SYSTEM", title: "Your tickets are ready", body: `${event.name} — order ${number}. Show the QR code at the gate.`, url: `/account/orders/${order.id}` } });
  await track({ type: "ticket_purchase", userId: user.id, entityType: "event", entityId: event.id, valueMinor: await usdMinor(total, currency) });
  return order;
}
