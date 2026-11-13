import type { Metadata } from "next";
import Link from "next/link";
import { getCountryRankings } from "@/server/services/rankings";
import { Breadcrumbs, EmptyState, Flag } from "@/components/ui";

export const metadata: Metadata = { title: "Country Rankings — Top African Boxing Nations", description: "Which African nation leads ACL? National rankings calculated from champions, ranked contenders, wins and gyms.", alternates: { canonical: "/rankings/countries" } };

export default async function CountryRankingsPage() {
  const rows = await getCountryRankings();
  return (
    <div className="container-acl py-6 sm:py-10">
      <Breadcrumbs items={[{ href: "/rankings", label: "Rankings" }, { label: "Countries" }]} />
      <p className="eyebrow">Nation vs nation</p>
      <h1 className="text-4xl sm:text-6xl">Top African boxing countries</h1>
      <p className="mt-3 max-w-2xl text-fog">Calculated live from league data: 25 points per reigning champion, up to 10 per ranked contender by position, 3 per ACL win, 1 per active fighter and 2 per affiliated gym.</p>
      <div className="mt-8">
        {rows.length ? (
          <div className="card overflow-x-auto">
            <table className="table-acl min-w-[640px]">
              <thead><tr><th>#</th><th>Country</th><th>Score</th><th>Champions</th><th>Ranked</th><th>ACL wins</th><th>Fighters</th><th>Gyms</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.country.code}>
                    <td className="display text-3xl text-red">{i + 1}</td>
                    <td><Link href={`/map/${r.country.code.toLowerCase()}`} className="font-semibold hover:text-gold"><Flag code={r.country.code} /> {r.country.name}</Link></td>
                    <td className="display text-2xl text-gold">{r.score}</td>
                    <td className="tabular-nums">{r.champions}</td><td className="tabular-nums">{r.ranked}</td><td className="tabular-nums">{r.aclWins}</td><td className="tabular-nums">{r.fighters}</td><td className="tabular-nums">{r.gyms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No data yet" />}
      </div>
    </div>
  );
}
