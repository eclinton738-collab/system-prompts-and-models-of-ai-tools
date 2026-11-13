import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { Artwork } from "@/components/media";
import { EmptyState } from "@/components/ui";
import { duration } from "@/lib/format";

export const metadata: Metadata = { title: "ACL Originals", description: "Premium storytelling from Africa Combat League: the founding story, fighter documentaries, rivalry films and gym stories.", alternates: { canonical: "/originals" } };

export default async function OriginalsPage() {
  const series = await db.series.findMany({ orderBy: { sortOrder: "asc" }, include: { videos: { where: { status: "PUBLISHED" }, orderBy: { episode: "asc" } } } });
  const kinds = [...new Set(series.map((s) => s.kind))];
  return (
    <>
      <header className="relative overflow-hidden border-b border-line bg-coal">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_0%,rgba(214,171,59,0.28),transparent_60%)]" />
        <div className="container-acl relative py-12 sm:py-20">
          <p className="eyebrow">ACL Originals</p>
          <h1 className="mt-1 max-w-4xl text-5xl sm:text-8xl">Every fight has a story</h1>
          <p className="mt-4 max-w-2xl text-lg text-fog">Documentaries and series from inside the league: how it was built, who fights in it, and what it costs them.</p>
        </div>
      </header>
      <div className="container-acl space-y-14 py-10 sm:py-14">
        {series.length === 0 && <EmptyState title="Originals are in production" />}
        {kinds.map((kind) => (
          <section key={kind} aria-label={kind}>
            <h2 className="mb-6 text-3xl text-gold sm:text-4xl">{kind === "ACL Original" ? "The founding story" : `${kind}s`}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {series.filter((s) => s.kind === kind).map((s, i) => {
                const first = s.videos[0];
                const inner = (
                  <>
                    <div className="relative aspect-[3/4] overflow-hidden">
                      <Artwork alt="" seed={s.slug} tone="gold" />
                      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black via-black/30 to-transparent p-4">
                        <span className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-gold">{kind === "ACL Original" ? `Chapter ${i + 1}` : kind}</span>
                        <span className="display text-4xl leading-none">{s.title}</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-fog">{s.description}</p>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-bone">{first ? `▶ Watch · ${duration(first.durationSec)}${first.premium ? " · Premium" : ""}` : "Coming soon"}</p>
                    </div>
                  </>
                );
                return first ? <Link key={s.id} href={`/watch/${first.slug}`} className="card card-hover block overflow-hidden">{inner}</Link> : <div key={s.id} className="card overflow-hidden opacity-70">{inner}</div>;
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
