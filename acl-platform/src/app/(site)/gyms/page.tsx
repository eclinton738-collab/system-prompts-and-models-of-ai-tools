import type { Metadata } from "next";
import { db } from "@/server/db";
import { GymCard } from "@/components/cards";
import { FilterBar } from "@/components/FilterBar";
import { EmptyState, PageHeader } from "@/components/ui";
import { GYM_DISCIPLINES } from "@/lib/site";
import { flag } from "@/lib/format";

export const metadata: Metadata = { title: "Gym Directory", description: "Find boxing, MMA, wrestling, kickboxing and fitness gyms across Africa, including ACL-affiliated gyms.", alternates: { canonical: "/gyms" } };

type SP = { q?: string; country?: string; state?: string; city?: string; discipline?: string; affiliated?: string };

export default async function GymsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [gyms, all] = await Promise.all([
    db.gym.findMany({
      where: {
        ...(sp.q && { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { city: { contains: sp.q, mode: "insensitive" } }] }),
        ...(sp.country && { countryCode: sp.country }), ...(sp.state && { state: sp.state }), ...(sp.city && { city: sp.city }),
        ...(sp.discipline && { disciplines: { has: sp.discipline } }), ...(sp.affiliated === "yes" && { aclAffiliated: true }),
      },
      include: { country: true }, orderBy: [{ aclAffiliated: "desc" }, { name: "asc" }],
    }),
    db.gym.findMany({ select: { countryCode: true, state: true, city: true, country: { select: { name: true } } } }),
  ]);
  const uniq = (xs: (string | null)[]) => [...new Set(xs.filter(Boolean) as string[])].sort();
  return (
    <>
      <PageHeader eyebrow="Train" title="Gym directory" intro="Where Africa's fighters are made. Search by location and discipline." />
      <div className="container-acl py-6 sm:py-10">
        <FilterBar
          action="/gyms"
          filters={[
            { name: "q", label: "Search", type: "search", value: sp.q, placeholder: "Gym or city" },
            { name: "country", label: "Country", value: sp.country, options: [...new Map(all.map((g) => [g.countryCode, g.country.name])).entries()].map(([c, n]) => ({ value: c, label: `${flag(c)} ${n}` })) },
            { name: "state", label: "State / region", value: sp.state, options: uniq(all.map((g) => g.state)).map((s) => ({ value: s, label: s })) },
            { name: "city", label: "City", value: sp.city, options: uniq(all.map((g) => g.city)).map((s) => ({ value: s, label: s })) },
            { name: "discipline", label: "Discipline", value: sp.discipline, options: GYM_DISCIPLINES.map((d) => ({ value: d, label: d })) },
            { name: "affiliated", label: "ACL affiliation", value: sp.affiliated, options: [{ value: "yes", label: "Affiliated only" }] },
          ]}
        />
        <p className="my-4 text-sm text-fog" aria-live="polite">{gyms.length} {gyms.length === 1 ? "gym" : "gyms"}</p>
        {gyms.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{gyms.map((g) => <GymCard key={g.id} gym={g} />)}</div> : <EmptyState title="No gyms match" action={{ href: "/gyms", label: "Reset filters" }} />}
      </div>
    </>
  );
}
