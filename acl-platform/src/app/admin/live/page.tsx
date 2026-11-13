import Link from "next/link";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import { getLiveSnapshot } from "@/server/services/live";
import { LiveConsole } from "@/components/client/LiveConsole";
import { EmptyState } from "@/components/ui";
import { fmtDateShort } from "@/lib/format";

export const metadata = { title: "Live console" };

export default async function LivePage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  await requirePermission("live.manage");
  const events = await db.event.findMany({ where: { type: "FIGHT_NIGHT", status: { in: ["SCHEDULED", "LIVE"] } }, orderBy: { startsAt: "asc" } });
  const sp = await searchParams;
  const selected = events.find((e) => e.id === sp.event) ?? events.find((e) => e.status === "LIVE") ?? events[0];
  const snap = selected ? await getLiveSnapshot(selected.id) : null;
  return (
    <div className="max-w-5xl">
      <h1 className="text-4xl sm:text-5xl">Live console</h1>
      <p className="mb-5 mt-1 max-w-2xl text-sm text-fog">Run fight night from ringside: set the event live, start bouts, drive the round clock, post commentary, enter statistics and scorecards, and record official results. Public scoreboards update within two seconds.</p>
      {events.length > 1 && <nav aria-label="Events" className="mb-5 flex flex-wrap gap-2">{events.map((e) => <Link key={e.id} href={`/admin/live?event=${e.id}`} aria-current={e.id === selected?.id ? "page" : undefined} className={`chip min-h-9 px-3 ${e.id === selected?.id ? "chip-red" : "chip-outline"}`}>{e.name} · {fmtDateShort(e.startsAt)}</Link>)}</nav>}
      {selected && snap ? <><LiveConsole key={selected.id} eventId={selected.id} eventName={selected.name} initial={snap} /><p className="mt-6 text-sm"><Link href={`/events/${selected.slug}`} target="_blank" className="text-gold underline">Open the public event page in a new tab ↗</Link></p></> : <EmptyState title="No upcoming fight nights" action={{ href: "/admin/events/new", label: "Create an event" }} />}
    </div>
  );
}
