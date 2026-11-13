import type { Metadata } from "next";
import Link from "next/link";
import { getChampions } from "@/server/services/rankings";
import { fighterName } from "@/server/services/fighters";
import { BeltIcon, FighterPortrait } from "@/components/media";
import { Flag, PageHeader } from "@/components/ui";
import { fmtDateShort } from "@/lib/format";

export const metadata: Metadata = { title: "Champions", description: "The reigning champions of Africa Combat League in every weight class, with title history and the road to the title.", alternates: { canonical: "/champions" } };

export default async function ChampionsPage() {
  const champs = await getChampions();
  return (
    <>
      <PageHeader eyebrow="The belts" title="Current champions" intro="One champion per division. Everyone else is on the road to the title." />
      <div className="container-acl grid gap-4 py-8 sm:grid-cols-2 sm:py-12 xl:grid-cols-4">
        {champs.map((c) => (
          <article key={c.division.id} className="card relative flex flex-col overflow-hidden border-gold/30">
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
              <h2 className="display text-xl tracking-wider text-gold">{c.division.name}</h2>
              <BeltIcon className="h-5 w-10" />
            </div>
            {c.fighter && c.reign ? (
              <>
                <Link href={`/fighters/${c.fighter.slug}`} className="group relative block aspect-[4/5] overflow-hidden">
                  <FighterPortrait fighter={c.fighter} champion />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    {c.fighter.nickname && <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold">“{c.fighter.nickname}”</p>}
                    <p className="display text-4xl leading-none group-hover:text-gold">{fighterName(c.fighter)}</p>
                    <p className="mt-1 text-sm"><Flag code={c.fighter.countryCode} /> {c.fighter.record.wins}–{c.fighter.record.losses}–{c.fighter.record.draws} · {c.fighter.record.kos} KO</p>
                  </div>
                </Link>
                <dl className="grid grid-cols-2 divide-x divide-line border-t border-line text-center text-sm">
                  <div className="p-2.5"><dt className="text-[0.62rem] uppercase tracking-widest text-fog">Champion since</dt><dd className="font-semibold">{fmtDateShort(c.reign.wonAt)}</dd></div>
                  <div className="p-2.5"><dt className="text-[0.62rem] uppercase tracking-widest text-fog">Defences</dt><dd className="font-semibold">{c.defenses}</dd></div>
                </dl>
                <div className="border-t border-line p-3 text-sm">
                  <p className="text-[0.62rem] uppercase tracking-widest text-fog">Next title defence</p>
                  {c.nextFight ? (
                    <Link href={`/fights/${c.nextFight.slug}`} className="font-semibold hover:text-gold">vs {(c.nextFight.fighterAId === c.fighter.id ? c.nextFight.fighterB : c.nextFight.fighterA).lastName} · {fmtDateShort(c.nextFight.event.startsAt)}</Link>
                  ) : <p className="text-fog">To be announced</p>}
                </div>
              </>
            ) : (
              <div className="flex aspect-[4/5] flex-col items-center justify-center p-6 text-center"><BeltIcon className="h-10 w-20 opacity-40" /><p className="display mt-4 text-3xl">Vacant</p></div>
            )}
            <Link href={`/champions/${c.division.slug}`} className="mt-auto border-t border-line px-4 py-3 text-xs font-semibold uppercase tracking-widest text-fog hover:text-gold">Title history & road to the title →</Link>
          </article>
        ))}
      </div>
    </>
  );
}
