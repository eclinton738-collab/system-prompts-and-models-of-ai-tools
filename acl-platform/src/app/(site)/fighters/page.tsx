import type { Metadata } from "next";
import { db } from "@/server/db";
import { listFighters } from "@/server/services/fighters";
import { getDivisions } from "@/server/services/rankings";
import { FighterCardView } from "@/components/cards";
import { FilterBar } from "@/components/FilterBar";
import { EmptyState, PageHeader } from "@/components/ui";
import { FIGHT_STYLES } from "@/lib/site";
import { flag } from "@/lib/format";

export const metadata: Metadata = { title: "Fighters", description: "The Africa Combat League roster. Search and filter every ACL fighter by country, weight class, ranking, gym and style.", alternates: { canonical: "/fighters" } };

type SP = Record<string, string | undefined>;

export default async function FightersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [fighters, divisions, countries, gyms] = await Promise.all([
    listFighters({
      q: sp.q, country: sp.country, division: sp.division, gender: sp.gender, status: sp.status, gym: sp.gym, style: sp.style, sort: sp.sort,
      champion: sp.rank === "champion", undefeated: sp.record === "undefeated",
      minAge: sp.age ? Number(sp.age.split("-")[0]) : undefined, maxAge: sp.age ? Number(sp.age.split("-")[1]) : undefined,
    }),
    getDivisions(),
    db.country.findMany({ where: { fighters: { some: {} } }, orderBy: { name: "asc" } }),
    db.gym.findMany({ where: { fighters: { some: {} } }, orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);
  const shown = sp.rank === "ranked" ? fighters.filter((f) => f.isChampion || f.ranking) : fighters;
  return (
    <>
      <PageHeader eyebrow="The roster" title="Fighters" intro="Every athlete under contract with Africa Combat League. Follow your fighters to get alerts when they are booked." />
      <div className="container-acl py-6 sm:py-10">
        <FilterBar
          action="/fighters"
          filters={[
            { name: "q", label: "Search", type: "search", value: sp.q, placeholder: "Name or nickname" },
            { name: "country", label: "Country", value: sp.country, options: countries.map((c) => ({ value: c.code, label: `${flag(c.code)} ${c.name}` })) },
            { name: "division", label: "Weight class", value: sp.division, options: divisions.map((d) => ({ value: d.slug, label: d.name })) },
            { name: "gender", label: "Gender", value: sp.gender, options: [{ value: "MEN", label: "Men" }, { value: "WOMEN", label: "Women" }] },
            { name: "rank", label: "Ranking", value: sp.rank, options: [{ value: "champion", label: "Champions" }, { value: "ranked", label: "Ranked" }] },
            { name: "record", label: "Record", value: sp.record, options: [{ value: "undefeated", label: "Undefeated" }] },
            { name: "gym", label: "Gym", value: sp.gym, options: gyms.map((g) => ({ value: g.slug, label: g.name })) },
            { name: "style", label: "Fighting style", value: sp.style, options: FIGHT_STYLES.map((s) => ({ value: s, label: s })) },
            { name: "age", label: "Age", value: sp.age, options: [{ value: "18-24", label: "Under 25" }, { value: "25-29", label: "25–29" }, { value: "30-34", label: "30–34" }, { value: "35-60", label: "35+" }] },
            { name: "status", label: "Status", value: sp.status, options: [{ value: "ACTIVE", label: "Active" }, { value: "RETIRED", label: "Retired" }, { value: "INACTIVE", label: "Inactive" }] },
            { name: "sort", label: "Sort by", value: sp.sort, options: [{ value: "name", label: "Name" }, { value: "wins", label: "Most wins" }, { value: "ko", label: "KO %" }] },
          ]}
        />
        <p className="my-4 text-sm text-fog" aria-live="polite">{shown.length} {shown.length === 1 ? "fighter" : "fighters"}</p>
        {shown.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{shown.map((f) => <FighterCardView key={f.id} fighter={f} />)}</div>
        ) : (
          <EmptyState title="No fighters match those filters" body="Try removing a filter or searching by surname." action={{ href: "/fighters", label: "Reset filters" }} />
        )}
      </div>
    </>
  );
}
