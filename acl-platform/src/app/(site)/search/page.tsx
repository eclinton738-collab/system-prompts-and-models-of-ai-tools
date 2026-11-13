import type { Metadata } from "next";
import Link from "next/link";
import { globalSearch } from "@/server/services/search";
import { getAiProvider } from "@/server/integrations/ai";
import { getFighterCards } from "@/server/services/fighters";
import { ArticleCard, EventCardView, FighterCardView, FightRow, GymCard, VideoCard } from "@/components/cards";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Search", description: "Search ACL fighters, events, fights, news, videos, gyms and rankings.", robots: { index: false }, alternates: { canonical: "/search" } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; ask?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const ask = sp.ask?.trim().slice(0, 200) ?? "";
  const res = q ? await globalSearch(q, 12) : null;
  const ai = getAiProvider();
  const rec = ask ? await ai.recommend(ask) : null;
  const recFighters = rec?.fighterIds.length ? await getFighterCards({ id: { in: rec.fighterIds } }) : [];
  const sections = res
    ? ([
        ["Fighters", res.fighters.length, <div key="f" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{res.fighters.map((f) => <FighterCardView key={f.id} fighter={f} />)}</div>],
        ["Champions", res.champions.length, <ul key="c" className="flex flex-wrap gap-2">{res.champions.map((f) => <li key={f.id}><Link href={`/champions/${f.division.slug}`} className="chip chip-gold min-h-9 px-3">{f.lastName} — {f.division.name} champion</Link></li>)}</ul>],
        ["Rankings", res.divisions.length, <ul key="d" className="flex flex-wrap gap-2">{res.divisions.map((d) => <li key={d.id}><Link href={`/rankings?division=${d.slug}`} className="chip chip-outline min-h-9 px-3 hover:text-bone">{d.name} rankings</Link></li>)}</ul>],
        ["Events", res.events.length, <div key="e" className="grid gap-3 lg:grid-cols-2">{res.events.map((e) => <EventCardView key={e.id} event={e} />)}</div>],
        ["Fights", res.fights.length, <div key="fi" className="grid gap-3 lg:grid-cols-2">{res.fights.map((f) => <FightRow key={f.id} fight={f} />)}</div>],
        ["News", res.articles.length, <div key="n" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{res.articles.map((a) => <ArticleCard key={a.id} article={a} />)}</div>],
        ["Videos", res.videos.length, <div key="v" className="grid grid-cols-2 gap-4 lg:grid-cols-4">{res.videos.map((v) => <VideoCard key={v.id} video={v} />)}</div>],
        ["Gyms", res.gyms.length, <div key="g" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{res.gyms.map((g) => <GymCard key={g.id} gym={g} />)}</div>],
      ] as const).filter(([, n]) => n > 0)
    : [];
  return (
    <>
      <PageHeader eyebrow="Search" title={q ? `“${q}”` : "Search ACL"}>
        <form action="/search" role="search" className="mt-5 flex max-w-2xl gap-2">
          <label htmlFor="sq" className="sr-only">Search</label>
          <input id="sq" name="q" type="search" defaultValue={q} placeholder="Fighters, events, fights, news, videos, gyms" className="field" autoFocus={!q && !ask} />
          <button className="btn btn-red" type="submit">Search</button>
        </form>
        {res && <p className="mt-3 text-sm text-fog" aria-live="polite">{res.total} {res.total === 1 ? "result" : "results"}</p>}
      </PageHeader>
      <div className="container-acl space-y-12 py-8 sm:py-10">
        {sections.length > 0 && (
          <nav aria-label="Result types"><ul className="flex flex-wrap gap-2">{sections.map(([t, n]) => <li key={t}><a href={`#s-${t}`} className="chip chip-outline min-h-9 px-3 hover:text-bone">{t} · {n}</a></li>)}</ul></nav>
        )}
        {sections.map(([t, , body]) => (
          <section key={t} id={`s-${t}`} aria-label={t} className="scroll-mt-20"><h2 className="mb-4 text-3xl">{t}</h2>{body}</section>
        ))}
        {q && q.length < 2 && <EmptyState title="Type at least two characters" />}
        {res && res.total === 0 && <EmptyState title={`Nothing found for “${q}”`} body="Check the spelling, or try a surname, a city or an event number." action={{ href: "/fighters", label: "Browse all fighters" }} />}

        <section aria-labelledby="ask" className="card p-5 sm:p-6">
          <p className="eyebrow">Fight finder · beta</p>
          <h2 id="ask" className="mt-1 text-3xl">What should I watch?</h2>
          <p className="mt-1 max-w-2xl text-sm text-fog">Describe the kind of fighter you like — “pressure fighters”, “knockout artists from Nigeria”, “slick counter-punchers”.</p>
          <form action="/search" className="mt-4 flex max-w-2xl gap-2">
            <label htmlFor="ask-q" className="sr-only">Describe what you like</label>
            <input id="ask-q" name="ask" defaultValue={ask} placeholder="I like pressure fighters" className="field" />
            <button className="btn btn-gold" type="submit">Recommend</button>
          </form>
          {rec && (
            <div className="mt-6">
              <p className="text-sm"><span className="font-semibold">Showing {rec.interpreted}.</span> <span className="text-fog">{rec.note}</span></p>
              {recFighters.length ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{recFighters.map((f) => <FighterCardView key={f.id} fighter={f} />)}</div> : <p className="mt-3 text-sm text-fog">No fighters matched. Try a different description.</p>}
              <p className="mt-3 text-xs text-fog">Recommendations come from a rules engine matching fighting style and country in the fighter database{ai.isHeuristic ? " — not a language model" : ""}.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
