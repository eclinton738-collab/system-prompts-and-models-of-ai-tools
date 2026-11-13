import type { Metadata } from "next";
import Link from "next/link";
import { getMapData } from "@/server/services/map";
import { AfricaMap } from "@/components/AfricaMap";
import { Flag, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Africa Combat Map", description: "Explore ACL fighters and combat gyms across Africa, country by country.", alternates: { canonical: "/map" } };

export default async function MapPage() {
  const map = await getMapData();
  const active = map.rows.filter((r) => r.fighters || r.gyms).sort((a, b) => b.fighters - a.fighters || b.gyms - a.gyms);
  const markets = map.rows.filter((r) => r.aclMarket && !r.fighters && !r.gyms);
  return (
    <>
      <PageHeader eyebrow="Africa-first" title="Africa combat map" intro="Tap a country to meet its fighters and find its gyms. Numbers show active ACL fighters." />
      <div className="container-acl grid gap-8 py-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <AfricaMap data={map.byNumeric} className="mx-auto w-full max-w-2xl" />
        <div>
          <h2 className="mb-3 text-3xl">Countries on the map</h2>
          <ul className="divide-y divide-line border-y border-line">
            {active.map((r) => (
              <li key={r.code}>
                <Link href={`/map/${r.code.toLowerCase()}`} className="flex min-h-12 items-center justify-between gap-3 py-2.5 hover:text-gold">
                  <span className="font-semibold"><Flag code={r.code} /> {r.name}</span>
                  <span className="text-sm text-fog">{r.fighters} {r.fighters === 1 ? "fighter" : "fighters"} · {r.gyms} {r.gyms === 1 ? "gym" : "gyms"}</span>
                </Link>
              </li>
            ))}
          </ul>
          {markets.length > 0 && (
            <>
              <h2 className="mb-2 mt-8 text-2xl">Scouting next</h2>
              <p className="text-sm text-fog">ACL priority markets without a signed fighter yet:</p>
              <ul className="mt-3 flex flex-wrap gap-2">{markets.map((r) => <li key={r.code}><Link href={`/map/${r.code.toLowerCase()}`} className="chip chip-outline min-h-9 px-3 hover:text-bone"><Flag code={r.code} /> {r.name}</Link></li>)}</ul>
            </>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/rankings/countries" className="btn btn-white">Country rankings</Link>
            <Link href="/gyms" className="btn btn-ghost">Gym directory</Link>
          </div>
        </div>
      </div>
    </>
  );
}
