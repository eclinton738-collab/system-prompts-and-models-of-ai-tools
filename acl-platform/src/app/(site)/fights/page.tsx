import type { Metadata } from "next";
import { listFights } from "@/server/services/fights";
import { FightRow } from "@/components/cards";
import { EmptyState, PageHeader, Tabs } from "@/components/ui";

export const metadata: Metadata = { title: "Fight Center", description: "Every ACL fight: upcoming bouts, live fights and completed results with records, tale of the tape and statistics.", alternates: { canonical: "/fights" } };

export default async function FightsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: raw } = await searchParams;
  const [upcoming, live, completed] = await Promise.all([listFights({ status: "SCHEDULED" }), listFights({ status: "LIVE" }), listFights({ status: "COMPLETED" })]);
  const tab = raw === "live" || raw === "completed" ? raw : live.length && !raw ? "live" : "upcoming";
  const list = tab === "live" ? live : tab === "completed" ? completed : upcoming;
  return (
    <>
      <PageHeader eyebrow="ACL Fight Center" title="Fights" intro="Who is fighting, when, and what happened. Open any bout for the tale of the tape, statistics and fan predictions." />
      <div className="container-acl py-6 sm:py-10">
        <Tabs base="/fights?tab=upcoming" active={tab} tabs={[{ key: "upcoming", label: "Upcoming", count: upcoming.length }, { key: "live", label: "Live", count: live.length }, { key: "completed", label: "Completed", count: completed.length }]} />
        <div className="mt-6">
          {list.length ? (
            <div className="grid gap-3 lg:grid-cols-2">{list.map((f) => <FightRow key={f.id} fight={f} />)}</div>
          ) : tab === "live" ? (
            <EmptyState title="No fights are live right now" body="When an ACL card is under way, live bouts appear here with round, clock and scoring." action={{ href: "/events", label: "See the schedule" }} />
          ) : (
            <EmptyState title={tab === "completed" ? "No completed fights" : "No fights scheduled"} action={{ href: "/news", label: "Latest announcements" }} />
          )}
        </div>
      </div>
    </>
  );
}
