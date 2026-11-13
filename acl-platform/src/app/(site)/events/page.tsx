import type { Metadata } from "next";
import { db } from "@/server/db";
import { listEvents } from "@/server/services/events";
import { EventCardView } from "@/components/cards";
import { FilterBar } from "@/components/FilterBar";
import { EmptyState, PageHeader, Tabs } from "@/components/ui";
import { flag, fmtMonth, label, monthKey } from "@/lib/format";

export const metadata: Metadata = { title: "Events & Calendar", description: "The ACL event calendar: fight nights, weigh-ins, press conferences, open workouts and fan events across Africa.", alternates: { canonical: "/events" } };

type SP = { tab?: string; country?: string; city?: string; month?: string; type?: string };

export default async function EventsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const tab = sp.tab === "past" ? "past" : "upcoming";
  const [events, all] = await Promise.all([
    listEvents({ when: tab, country: sp.country, city: sp.city, month: sp.month, type: sp.type }),
    db.event.findMany({ select: { city: true, startsAt: true, countryCode: true, country: { select: { name: true } } }, orderBy: { startsAt: "asc" } }),
  ]);
  const countries = [...new Map(all.map((e) => [e.countryCode, e.country.name])).entries()];
  const cities = [...new Set(all.map((e) => e.city))].sort();
  const months = [...new Map(all.map((e) => [monthKey(e.startsAt), fmtMonth(e.startsAt)])).entries()];
  const byMonth = new Map<string, typeof events>();
  for (const e of events) {
    const k = fmtMonth(e.startsAt);
    byMonth.set(k, [...(byMonth.get(k) ?? []), e]);
  }
  return (
    <>
      <PageHeader eyebrow="Calendar" title="Events" intro="Fight nights and everything around them. All times shown in West Africa Time (WAT)." />
      <div className="container-acl py-6 sm:py-10">
        <Tabs base="/events" active={tab} tabs={[{ key: "upcoming", label: "Upcoming" }, { key: "past", label: "Past events" }]} />
        <div className="mt-5">
          <FilterBar
            action="/events"
            hidden={{ tab: tab === "past" ? "past" : undefined }}
            filters={[
              { name: "country", label: "Country", value: sp.country, options: countries.map(([code, name]) => ({ value: code, label: `${flag(code)} ${name}` })) },
              { name: "city", label: "City", value: sp.city, options: cities.map((c) => ({ value: c, label: c })) },
              { name: "month", label: "Month", value: sp.month, options: months.map(([k, v]) => ({ value: k, label: v })) },
              { name: "type", label: "Event type", value: sp.type, options: ["FIGHT_NIGHT", "WEIGH_IN", "PRESS_CONFERENCE", "OPEN_WORKOUT", "FAN_EVENT"].map((t) => ({ value: t, label: label(t) })) },
            ]}
          />
        </div>
        <div className="mt-8 space-y-10">
          {events.length ? (
            [...byMonth.entries()].map(([month, list]) => (
              <section key={month} aria-label={month}>
                <h2 className="mb-4 border-b border-line pb-2 text-2xl text-gold sm:text-3xl">{month}</h2>
                <div className="grid gap-3 lg:grid-cols-2">{list.map((e) => <EventCardView key={e.id} event={e} />)}</div>
              </section>
            ))
          ) : (
            <EmptyState title={tab === "past" ? "No past events match" : "No upcoming events match"} body="Try clearing a filter." action={{ href: "/events", label: "Reset" }} />
          )}
        </div>
      </div>
    </>
  );
}
