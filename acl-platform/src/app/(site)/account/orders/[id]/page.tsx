import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { Breadcrumbs } from "@/components/ui";
import { fmtDate, fmtEventDate, fmtTime, money } from "@/lib/format";

export const metadata = { title: "Order" };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ placed?: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/account/orders/${id}`);
  // Scoped to the signed-in user: another customer's order id returns 404.
  const order = await db.order.findFirst({ where: { id, userId: user.id }, include: { items: true, tickets: { include: { ticketType: { include: { event: true } } } } } });
  if (!order) notFound();
  const qrs = await Promise.all(order.tickets.map((t) => QRCode.toString(t.code, { type: "svg", margin: 1, color: { dark: "#08080a", light: "#ffffff" } })));
  return (
    <>
      <Breadcrumbs items={[{ href: "/account/orders", label: "Orders" }, { label: order.number }]} />
      {(await searchParams).placed && <p role="status" className="mb-5 border border-win/50 bg-win/10 p-4 font-semibold text-win">Order confirmed. {order.kind === "TICKETS" ? "Your tickets are below." : "We will email you when it ships."}</p>}
      <h1 className="text-4xl sm:text-5xl">Order {order.number}</h1>
      <p className="mt-1 text-sm text-fog">{fmtDate(order.createdAt)} · {order.status} · Payment: {order.paymentProvider}{order.paymentProvider === "mock" ? " (demo — no money charged)" : ""}</p>

      {order.tickets.length > 0 && (
        <section aria-labelledby="tix" className="mt-8">
          <h2 id="tix" className="mb-4 text-3xl">Digital tickets</h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {order.tickets.map((t, i) => (
              <li key={t.id} className="flex overflow-hidden border border-line bg-coal">
                <div className="flex-1 p-4">
                  <p className="eyebrow">{t.ticketType.name} · {t.ticketType.section}</p>
                  <p className="display mt-1 text-2xl leading-none">{t.ticketType.event.name}</p>
                  <p className="mt-2 text-sm text-fog">{fmtEventDate(t.ticketType.event.startsAt)} · {fmtTime(t.ticketType.event.startsAt)}<br />{t.ticketType.event.venue}, {t.ticketType.event.city}</p>
                  <p className="mt-3 text-sm">Holder: <span className="font-semibold">{t.holderName}</span></p>
                  <p className="mt-1 break-all font-mono text-xs text-fog">{t.code}</p>
                  {t.checkedInAt && <span className="chip chip-gold mt-2">Checked in</span>}
                </div>
                <div className="flex w-32 shrink-0 items-center border-l border-dashed border-line bg-white p-2 sm:w-40" role="img" aria-label={`QR code for ticket ${i + 1}`} dangerouslySetInnerHTML={{ __html: qrs[i] }} />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-fog">Show the QR code at the gate. Each code admits one person once.</p>
        </section>
      )}

      <section aria-labelledby="sum" className="mt-8 max-w-xl">
        <h2 id="sum" className="mb-3 text-3xl">Summary</h2>
        <ul className="divide-y divide-line border-y border-line text-sm">
          {order.items.map((i) => <li key={i.id} className="flex justify-between gap-3 py-2.5"><span>{i.quantity} × {i.description}{i.size ? ` (${i.size})` : ""}</span><span className="tabular-nums">{money(i.unitMinor * i.quantity, order.currency)}</span></li>)}
        </ul>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-fog">Subtotal</dt><dd>{money(order.subtotalMinor, order.currency)}</dd></div>
          {order.discountMinor > 0 && <div className="flex justify-between"><dt className="text-fog">Discount ({order.promoCode})</dt><dd>−{money(order.discountMinor, order.currency)}</dd></div>}
          <div className="flex justify-between border-t border-line pt-2"><dt className="font-semibold">Total</dt><dd className="display text-3xl">{money(order.totalMinor, order.currency)}</dd></div>
        </dl>
        {order.shippingName && <p className="mt-4 text-sm text-fog">Ships to: {order.shippingName}, {order.shippingAddress}, {order.shippingCity}, {order.shippingCountry} · {order.phone}</p>}
      </section>
      <Link href={order.kind === "TICKETS" ? "/events" : "/shop"} className="btn btn-ghost mt-8">{order.kind === "TICKETS" ? "More events" : "Keep shopping"}</Link>
    </>
  );
}
