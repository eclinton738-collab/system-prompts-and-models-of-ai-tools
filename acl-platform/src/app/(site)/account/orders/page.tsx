import Link from "next/link";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { EmptyState } from "@/components/ui";
import { fmtDate, money } from "@/lib/format";

export const metadata = { title: "Tickets & orders" };

export default async function OrdersPage() {
  const user = await requireUser("/account/orders");
  const orders = await db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { items: true, _count: { select: { tickets: true } } } });
  return (
    <>
      <h1 className="mb-6 text-4xl sm:text-5xl">Tickets & orders</h1>
      {orders.length ? (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/account/orders/${o.id}`} className="card card-hover flex flex-wrap items-center justify-between gap-3 p-4">
                <span><span className="chip mr-2">{o.kind === "TICKETS" ? `${o._count.tickets} tickets` : "Shop"}</span><span className="font-semibold">{o.items.map((i) => i.description).join(", ").slice(0, 80)}</span><span className="block text-xs text-fog">{o.number} · {fmtDate(o.createdAt)}</span></span>
                <span className="text-right"><span className="display block text-2xl">{money(o.totalMinor, o.currency)}</span><span className="text-xs uppercase tracking-widest text-win">{o.status}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <EmptyState title="No orders yet" body="Tickets and merchandise you buy appear here." action={{ href: "/tickets", label: "Get tickets" }} />}
    </>
  );
}
