import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { getMoney } from "@/server/services/money";
import { DateBlock } from "@/components/cards";
import { EmptyState, Flag, PageHeader } from "@/components/ui";
import { fmtTime } from "@/lib/format";

export const metadata: Metadata = { title: "Tickets", description: "Official tickets for upcoming Africa Combat League events.", alternates: { canonical: "/tickets" } };

export default async function TicketsPage() {
  const [events, m] = await Promise.all([
    db.event.findMany({ where: { status: { in: ["SCHEDULED", "LIVE"] }, type: "FIGHT_NIGHT" }, orderBy: { startsAt: "asc" }, include: { country: true, ticketTypes: { where: { salesOpen: true }, orderBy: { priceMinor: "asc" }, take: 1 } } }),
    getMoney(),
  ]);
  return (
    <>
      <PageHeader eyebrow="Be in the building" title="Tickets" intro="Buy direct from ACL. Tickets are digital, delivered instantly to your account with a QR code for the gate." />
      <div className="container-acl space-y-3 py-8">
        {events.length ? events.map((e) => (
          <div key={e.id} className="card flex flex-col overflow-hidden sm:flex-row sm:items-stretch">
            <div className="flex flex-1">
              <DateBlock date={e.startsAt} />
              <div className="min-w-0 flex-1 p-4">
                <Link href={`/events/${e.slug}`} className="display text-2xl leading-none hover:text-gold sm:text-3xl">{e.name}</Link>
                <p className="mt-1.5 text-sm text-fog"><Flag code={e.countryCode} name={e.country.name} /> {e.venue}, {e.city} · {fmtTime(e.startsAt)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-line p-4 sm:border-l sm:border-t-0">
              <span className="text-sm text-fog">{e.ticketTypes[0] ? <>from <span className="font-semibold text-bone">{m.fmt(e.ticketTypes[0].priceMinor, e.ticketTypes[0].currency)}</span></> : "On sale soon"}</span>
              <Link href={`/events/${e.slug}/tickets`} className="btn btn-red">{e.ticketTypes[0] ? "Get tickets" : "Details"}</Link>
            </div>
          </div>
        )) : <EmptyState title="No events on sale" body="The next ACL card will be announced soon." action={{ href: "/join", label: "Get ticket alerts" }} />}
      </div>
    </>
  );
}
