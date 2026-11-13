import Link from "next/link";

export function RivalryGrid({ rivalries }: { rivalries: { id: string; slug: string; type: string; sideA: string; sideB: string; tagline: string; _count: { votes: number; moments: number } }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rivalries.map((r) => (
        <Link key={r.id} href={`/rivalries/${r.slug}`} className="card card-hover relative overflow-hidden p-6">
          <span aria-hidden className="display absolute -right-3 -top-6 text-[9rem] leading-none text-white/5">VS</span>
          <span className="chip mb-4">{r.type === "REGION" ? "State / nation war" : "Fighter rivalry"}</span>
          <p className="display text-4xl leading-[0.9] sm:text-5xl">{r.sideA}<span className="block text-2xl text-red">vs</span>{r.sideB}</p>
          <p className="mt-3 text-sm text-fog">{r.tagline}</p>
          <p className="mt-4 text-xs uppercase tracking-widest text-fog">{r._count.moments} chapters · {r._count.votes} fan votes</p>
        </Link>
      ))}
    </div>
  );
}

