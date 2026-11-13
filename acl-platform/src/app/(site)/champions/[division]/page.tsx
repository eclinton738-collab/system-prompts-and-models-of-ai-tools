import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDivisionRankings, getTitleHistory } from "@/server/services/rankings";
import { fighterName } from "@/server/services/fighters";
import { FightRow } from "@/components/cards";
import { BeltIcon, FighterPortrait } from "@/components/media";
import { ShareButtons } from "@/components/client/ShareButtons";
import { Breadcrumbs, EmptyState, Flag } from "@/components/ui";
import { fmtDate } from "@/lib/format";

type Props = { params: Promise<{ division: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { division } = await params;
  const d = await getDivisionRankings(division);
  if (!d) return { title: "Division not found" };
  return { title: `ACL ${d.division.name} Championship`, description: `${d.champion ? `${fighterName(d.champion)} is the ACL ${d.division.name} champion.` : `The ACL ${d.division.name} title is vacant.`} Title history, championship fights and the road to the title.`, alternates: { canonical: `/champions/${division}` } };
}

export default async function ChampionshipPage({ params }: Props) {
  const { division } = await params;
  const data = await getDivisionRankings(division);
  if (!data) notFound();
  const history = await getTitleHistory(data.division.id);
  const previous = history.reigns.filter((r) => r.lostAt);
  // Road to the title: milestone rungs with whoever currently holds them.
  const at = (rank: number) => data.contenders.find((c) => c.rank === rank)?.fighter ?? null;
  const rungs: { label: string; fighter: ReturnType<typeof at> }[] = [
    { label: "Contender", fighter: null },
    { label: "#10", fighter: at(10) }, { label: "#5", fighter: at(5) }, { label: "#3", fighter: at(3) }, { label: "#1", fighter: at(1) },
    { label: "Champion", fighter: data.champion },
  ];
  return (
    <div className="container-acl py-6 sm:py-10">
      <Breadcrumbs items={[{ href: "/champions", label: "Champions" }, { label: data.division.name }]} />
      <p className="eyebrow flex items-center gap-2"><BeltIcon className="h-4 w-8" /> ACL championship</p>
      <h1 className="text-4xl sm:text-7xl">{data.division.name}</h1>
      <div className="mt-3"><ShareButtons compact path={`/champions/${division}`} title={`ACL ${data.division.name} championship`} image={`/api/og/rankings/${division}`} /></div>

      <section aria-labelledby="road" className="mt-10">
        <h2 id="road" className="mb-5 text-3xl sm:text-4xl">Road to the title</h2>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {rungs.map((r, i) => {
            const champ = i === rungs.length - 1;
            return (
              <li key={r.label} className={`relative border p-3 ${champ ? "border-gold bg-gold/10" : "border-line bg-coal"}`}>
                {i < rungs.length - 1 && <span aria-hidden className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 text-xl text-red lg:block">▶</span>}
                <p className={`display text-3xl ${champ ? "text-gold" : "text-red"}`}>{r.label}</p>
                {r.fighter ? (
                  <Link href={`/fighters/${r.fighter.slug}`} className="mt-2 flex items-center gap-2 hover:text-gold">
                    <span className="h-10 w-10 shrink-0 overflow-hidden rounded-sm bg-steel"><FighterPortrait fighter={r.fighter} champion={champ} /></span>
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold">{r.fighter.lastName}</span><span className="text-xs text-fog">{r.fighter.record.wins}–{r.fighter.record.losses}–{r.fighter.record.draws}</span></span>
                  </Link>
                ) : (
                  <p className="mt-2 text-xs text-fog">{i === 0 ? "Win fights. Get ranked." : champ ? "Vacant" : "Open position"}</p>
                )}
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-sm text-fog">See every contender in the <Link className="text-gold underline" href={`/rankings?division=${division}`}>{data.division.name} rankings</Link>.</p>
      </section>

      <section aria-labelledby="hist" className="mt-12">
        <h2 id="hist" className="mb-5 text-3xl sm:text-4xl">Championship history</h2>
        {history.reigns.length ? (
          <ol className="space-y-2">
            {history.reigns.map((r, i) => (
              <li key={r.id} className="card flex flex-wrap items-center gap-4 p-4">
                <span className="display w-10 text-3xl text-gold">{history.reigns.length - i}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/fighters/${r.fighter.slug}`} className="display text-2xl hover:text-gold"><Flag code={r.fighter.countryCode} /> {fighterName(r.fighter)}</Link>
                  <p className="text-sm text-fog">{fmtDate(r.wonAt)} — {r.lostAt ? fmtDate(r.lostAt) : "present"}{r.note ? ` · ${r.note}` : ""}</p>
                </div>
                {!r.lostAt && <span className="chip chip-gold">Reigning</span>}
              </li>
            ))}
          </ol>
        ) : <EmptyState title="No champion has been crowned" />}
        {history.reigns.length > 0 && previous.length === 0 && <p className="mt-3 text-sm text-fog">No previous champions — the inaugural champion still holds the belt.</p>}
      </section>

      <section aria-labelledby="tf" className="mt-12">
        <h2 id="tf" className="mb-5 text-3xl sm:text-4xl">Championship fights</h2>
        {history.titleFights.length ? <div className="grid gap-3 lg:grid-cols-2">{history.titleFights.map((f) => <FightRow key={f.id} fight={f} />)}</div> : <EmptyState title="No title fights yet" />}
      </section>
    </div>
  );
}
