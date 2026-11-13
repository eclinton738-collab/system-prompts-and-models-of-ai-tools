import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { getFighterCards } from "@/server/services/fighters";
import { getCountryRankings } from "@/server/services/rankings";
import { getMapData } from "@/server/services/map";
import { AfricaMap } from "@/components/AfricaMap";
import { EventCardView, FighterCardView, GymCard } from "@/components/cards";
import { Breadcrumbs, EmptyState, Flag, Stat } from "@/components/ui";

type Props = { params: Promise<{ code: string }> };
const load = (code: string) => db.country.findUnique({ where: { code: code.toUpperCase() } });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await load((await params).code);
  return c ? { title: `${c.name} — Fighters & Gyms`, description: `ACL fighters, gyms and events in ${c.name}.`, alternates: { canonical: `/map/${c.code.toLowerCase()}` } } : { title: "Country" };
}

export default async function CountryPage({ params }: Props) {
  const country = await load((await params).code);
  if (!country) notFound();
  const [fighters, gyms, events, rankings, map] = await Promise.all([
    getFighterCards({ countryCode: country.code }),
    db.gym.findMany({ where: { countryCode: country.code }, include: { country: true }, orderBy: { name: "asc" } }),
    db.event.findMany({ where: { countryCode: country.code, type: "FIGHT_NIGHT" }, include: { country: true }, orderBy: { startsAt: "desc" }, take: 6 }),
    getCountryRankings(),
    getMapData(),
  ]);
  const pos = rankings.findIndex((r) => r.country.code === country.code);
  const row = rankings[pos];
  fighters.sort((a, b) => Number(b.isChampion) - Number(a.isChampion) || (a.ranking?.rank ?? 99) - (b.ranking?.rank ?? 99));
  return (
    <div className="container-acl py-6 sm:py-10">
      <Breadcrumbs items={[{ href: "/map", label: "Combat map" }, { label: country.name }]} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div>
          <h1 className="text-5xl sm:text-8xl"><Flag code={country.code} /> {country.name}</h1>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Africa rank" value={pos >= 0 && row.score > 0 ? `#${pos + 1}` : "—"} accent />
            <Stat label="Champions" value={row?.champions ?? 0} />
            <Stat label="Fighters" value={fighters.length} />
            <Stat label="Gyms" value={gyms.length} />
          </div>
        </div>
        <AfricaMap data={map.byNumeric} active={country.code} className="mx-auto hidden w-full max-w-xs lg:block" />
      </div>
      <section aria-labelledby="c-f" className="mt-12">
        <h2 id="c-f" className="mb-5 text-3xl sm:text-4xl">Fighters</h2>
        {fighters.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{fighters.map((f) => <FighterCardView key={f.id} fighter={f} />)}</div> : <EmptyState title={`No ACL fighters from ${country.name} yet`} body="Could you be the first? Applications are open across the continent." action={{ href: "/apply", label: "Become an ACL fighter" }} />}
      </section>
      <section aria-labelledby="c-g" className="mt-12">
        <h2 id="c-g" className="mb-5 text-3xl sm:text-4xl">Gyms</h2>
        {gyms.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{gyms.map((g) => <GymCard key={g.id} gym={g} />)}</div> : <EmptyState title="No gyms listed" body="Gym owners can request a listing through the contact page." action={{ href: "/contact", label: "List your gym" }} />}
      </section>
      {events.length > 0 && (
        <section aria-labelledby="c-e" className="mt-12">
          <h2 id="c-e" className="mb-5 text-3xl sm:text-4xl">Events in {country.name}</h2>
          <div className="grid gap-3 lg:grid-cols-2">{events.map((e) => <EventCardView key={e.id} event={e} />)}</div>
        </section>
      )}
      <p className="mt-10 text-sm text-fog"><Link href="/rankings/countries" className="text-gold underline">See how {country.name} compares in the country rankings</Link></p>
    </div>
  );
}
