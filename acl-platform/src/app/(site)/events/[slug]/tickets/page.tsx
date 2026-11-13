import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { getMoney } from "@/server/services/money";
import { getPaymentProvider } from "@/server/integrations/payments";
import { TicketPicker } from "@/components/client/Commerce";
import { Breadcrumbs, EmptyState, Flag } from "@/components/ui";
import { fmtEventDate, fmtTime } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const e = await db.event.findUnique({ where: { slug }, select: { name: true } });
  return e ? { title: `Tickets — ${e.name}`, description: `Buy official tickets for ${e.name}. Digital delivery with QR code.`, alternates: { canonical: `/events/${slug}/tickets` } } : { title: "Tickets" };
}

export default async function EventTicketsPage({ params }: Props) {
  const { slug } = await params;
  const event = await db.event.findUnique({ where: { slug }, include: { country: true, ticketTypes: { orderBy: { sortOrder: "asc" }, include: { _count: { select: { tickets: true } } } } } });
  if (!event) notFound();
  const [user, m] = await Promise.all([getCurrentUser(), getMoney()]);
  const closed = event.status === "COMPLETED" || event.status === "CANCELLED";
  return (
    <div className="container-acl py-6 sm:py-10">
      <Breadcrumbs items={[{ href: "/events", label: "Events" }, { href: `/events/${event.slug}`, label: event.name }, { label: "Tickets" }]} />
      <p className="eyebrow">Official tickets</p>
      <h1 className="text-4xl sm:text-6xl">{event.name}</h1>
      <p className="mt-2 text-fog">{fmtEventDate(event.startsAt)} · {fmtTime(event.startsAt)} · <Flag code={event.countryCode} /> {event.venue}, {event.city}</p>
      <div className="mt-8">
        {closed ? (
          <EmptyState title={event.status === "CANCELLED" ? "This event was cancelled" : "This event has taken place"} body="Ticket sales are closed." action={{ href: "/events", label: "Upcoming events" }} />
        ) : event.ticketTypes.length === 0 ? (
          <EmptyState title="Tickets are not on sale yet" body="Join ACL and turn on ticket-release alerts to be first in line." action={{ href: user ? "/account/notifications" : "/join", label: user ? "Manage alerts" : "Join ACL" }} />
        ) : (
          <TicketPicker
            eventId={event.id}
            signedIn={!!user}
            defaultName={user?.name ?? ""}
            mockPayments={getPaymentProvider().isMock}
            types={event.ticketTypes.map((t) => ({ id: t.id, name: t.name, section: t.section, description: t.description, priceMinor: t.priceMinor, currency: t.currency, salesOpen: t.salesOpen, remaining: t.capacity - t._count.tickets, display: m.fmt(t.priceMinor, t.currency) }))}
          />
        )}
      </div>
      {event.ticketUrl && <p className="mt-6 text-sm text-fog">Also available from our <a className="text-gold underline" href={event.ticketUrl} target="_blank" rel="noopener noreferrer">official ticket partner</a>.</p>}
      <p className="mt-8 text-sm text-fog">Need help with an order? <Link href="/contact" className="text-gold underline">Contact ACL</Link>.</p>
    </div>
  );
}
