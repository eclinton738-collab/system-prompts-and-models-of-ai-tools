import type { Metadata } from "next";
import Link from "next/link";
import { getDivisionRankings, getDivisions } from "@/server/services/rankings";
import { FighterPortrait, BeltIcon } from "@/components/media";
import { ShareButtons } from "@/components/client/ShareButtons";
import { EmptyState, Flag, Movement, PageHeader } from "@/components/ui";
import { fmtDateShort } from "@/lib/format";
import { fighterName } from "@/server/services/fighters";

export const metadata: Metadata = { title: "Rankings", description: "Official Africa Combat League rankings: the champion and top ten contenders in every weight class, with movement, records and next fights.", alternates: { canonical: "/rankings" } };

export default async function RankingsPage({ searchParams }: { searchParams: Promise<{ division?: string }> }) {
  const sp = await searchParams;
  const divisions = await getDivisions();
  if (!divisions.length) return <div className="container-acl py-16"><EmptyState title="Rankings will be published soon" /></div>;
  const slug = divisions.some((d) => d.slug === sp.division) ? sp.division! : divisions[0].slug;
  const data = (await getDivisionRankings(slug))!;
  const next = (f: (typeof data.contenders)[number]["fighter"]) =>
    f.nextFight ? (
      <Link href={`/fights/${f.nextFight.slug}`} className="hover:text-gold">vs {(f.nextFight.fighterAId === f.id ? f.nextFight.fighterB : f.nextFight.fighterA).lastName} · {fmtDateShort(f.nextFight.event.startsAt)}</Link>
    ) : (
      <span className="text-fog">TBA</span>
    );
  return (
    <>
      <PageHeader eyebrow="Official ACL rankings" title="Rankings" intro="Voted by the ACL rankings panel after every event.">
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/rankings/countries" className="font-semibold uppercase tracking-widest text-gold">Country rankings →</Link>
          <Link href="/champions" className="font-semibold uppercase tracking-widest text-fog hover:text-bone">Champions →</Link>
        </div>
      </PageHeader>
      <div className="container-acl py-6 sm:py-10">
        <nav aria-label="Weight classes" className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: "none" }}>
          <ul className="flex min-w-max gap-2">
            {divisions.map((d) => (
              <li key={d.id}>
                <Link href={`/rankings?division=${d.slug}`} scroll={false} aria-current={d.slug === slug ? "page" : undefined} className={`display block min-h-11 px-4 py-2.5 text-lg tracking-wider ${d.slug === slug ? "bg-red text-white" : "border border-line text-fog hover:text-bone"}`}>{d.name}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-4xl sm:text-5xl">{data.division.name}</h2>
            <p className="text-sm text-fog">{data.division.limitLbs ? `Limit ${data.division.limitLbs} lbs / ${data.division.limitKg} kg` : "No upper weight limit"}</p>
          </div>
          <ShareButtons compact path={`/rankings?division=${slug}`} title={`ACL ${data.division.name} rankings`} image={`/api/og/rankings/${slug}`} />
        </div>

        {data.champion ? (
          <div className="relative mb-4 flex items-center gap-4 overflow-hidden border border-gold/60 bg-gradient-to-r from-gold/20 via-coal to-coal p-3 sm:p-5">
            <Link href={`/fighters/${data.champion.slug}`} aria-hidden tabIndex={-1} className="h-24 w-20 shrink-0 overflow-hidden sm:h-36 sm:w-28"><FighterPortrait fighter={data.champion} champion /></Link>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-gold"><BeltIcon className="h-4 w-8" /> Champion</p>
              <Link href={`/fighters/${data.champion.slug}`} className="display block truncate text-3xl hover:text-gold sm:text-6xl">{fighterName(data.champion)}</Link>
              <p className="mt-1 text-sm text-bone/80"><Flag code={data.champion.countryCode} /> {data.champion.country.name} · {data.champion.record.wins}–{data.champion.record.losses}–{data.champion.record.draws} · since {fmtDateShort(data.champion.wonAt)}</p>
              <p className="mt-1 text-sm">Next: {next(data.champion)}</p>
            </div>
          </div>
        ) : (
          <div className="card mb-4 p-5"><p className="display text-2xl text-gold">Title vacant</p><p className="text-sm text-fog">The top contenders will fight for the belt.</p></div>
        )}

        {data.contenders.length ? (
          <div className="card overflow-x-auto">
            <table className="table-acl min-w-[620px]">
              <caption className="sr-only">{data.division.name} contender rankings</caption>
              <thead><tr><th>Rank</th><th>Fighter</th><th>Record</th><th>Country</th><th>Prev</th><th>Move</th><th>Next fight</th></tr></thead>
              <tbody>
                {data.contenders.map(({ rank, previousRank, fighter: f }) => (
                  <tr key={f.id}>
                    <td className="display text-3xl text-red">{rank === 1 ? "#1" : `#${rank}`}{rank === 1 && <span className="ml-2 align-middle font-sans text-[0.6rem] font-bold uppercase tracking-widest text-gold">Contender</span>}</td>
                    <td>
                      <Link href={`/fighters/${f.slug}`} className="flex items-center gap-3 font-semibold hover:text-gold">
                        <span className="h-11 w-11 shrink-0 overflow-hidden rounded-sm bg-steel"><FighterPortrait fighter={f} /></span>{fighterName(f)}
                      </Link>
                    </td>
                    <td className="tabular-nums">{f.record.wins}–{f.record.losses}–{f.record.draws}</td>
                    <td className="whitespace-nowrap"><Flag code={f.countryCode} /> {f.country.name}</td>
                    <td className="tabular-nums text-fog">{previousRank ? `#${previousRank}` : "—"}</td>
                    <td><Movement rank={rank} previous={previousRank} /></td>
                    <td className="whitespace-nowrap text-sm">{next(f)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No ranked contenders yet" body="This division is being built. Contenders are ranked once they have fought under the ACL banner." />
        )}
        {data.contenders.length > 0 && data.contenders.length < 10 && <p className="mt-3 text-xs text-fog">Positions #{data.contenders.length + 1}–#10 are open. <Link href="/apply" className="text-gold underline">Think you belong here?</Link></p>}
      </div>
    </>
  );
}
