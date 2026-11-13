import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { EmptyState, PageHeader } from "@/components/ui";
import { RivalryGrid } from "@/components/RivalryGrid";

export const metadata: Metadata = { title: "Rivalries", description: "The feuds that define Africa Combat League: fighter rivalries, state wars and national derbies, with timelines, quotes and fan voting.", alternates: { canonical: "/rivalries" } };

export default async function RivalriesPage() {
  const rivalries = await db.rivalry.findMany({ orderBy: [{ featured: "desc" }, { title: "asc" }], include: { _count: { select: { votes: true, moments: true } } } });
  const fighters = rivalries.filter((r) => r.type === "FIGHTER");
  const regions = rivalries.filter((r) => r.type === "REGION");
  return (
    <>
      <PageHeader eyebrow="The rivalry engine" title="Rivalries" intro="Fights are better when they mean something. Follow every feud from first confrontation to final bell." />
      <div className="container-acl space-y-12 py-8 sm:py-12">
        {!rivalries.length && <EmptyState title="No rivalries yet" />}
        {fighters.length > 0 && <section aria-labelledby="fr"><h2 id="fr" className="mb-5 text-3xl sm:text-4xl">Fighter rivalries</h2><RivalryGrid rivalries={fighters} /></section>}
        {regions.length > 0 && (
          <section aria-labelledby="rr">
            <div className="mb-5 flex items-end justify-between"><h2 id="rr" className="text-3xl sm:text-4xl">State & nation wars</h2><Link href="/state-wars" className="text-sm font-semibold uppercase tracking-widest text-fog hover:text-gold">About State Wars →</Link></div>
            <RivalryGrid rivalries={regions} />
          </section>
        )}
      </div>
    </>
  );
}
