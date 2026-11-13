import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { getFighterCards } from "@/server/services/fighters";
import { FighterCardView } from "@/components/cards";
import { Artwork } from "@/components/media";
import { Breadcrumbs, EmptyState, Flag, JsonLd } from "@/components/ui";
import { abs } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };
const load = (slug: string) => db.gym.findUnique({ where: { slug }, include: { country: true, coaches: true, photos: true } });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = await load((await params).slug);
  return g ? { title: `${g.name} — ${g.city}, ${g.country.name}`, description: g.description.slice(0, 160), alternates: { canonical: `/gyms/${g.slug}` } } : { title: "Gym" };
}

export default async function GymPage({ params }: Props) {
  const gym = await load((await params).slug);
  if (!gym) notFound();
  const fighters = await getFighterCards({ gymId: gym.id });
  return (
    <article className="container-acl py-6 sm:py-10" data-entity-type="gym" data-entity-id={gym.id}>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "SportsActivityLocation", name: gym.name, description: gym.description, url: abs(`/gyms/${gym.slug}`), address: { "@type": "PostalAddress", addressLocality: gym.city, addressRegion: gym.state ?? undefined, addressCountry: gym.countryCode } }} />
      <Breadcrumbs items={[{ href: "/gyms", label: "Gyms" }, { href: `/map/${gym.countryCode.toLowerCase()}`, label: gym.country.name }, { label: gym.name }]} />
      <div className="mb-3 flex flex-wrap gap-2">
        {gym.aclAffiliated ? <span className="chip chip-gold">ACL affiliated gym</span> : <span className="chip chip-outline">Independent — not ACL affiliated</span>}
        {gym.disciplines.map((d) => <span key={d} className="chip">{d}</span>)}
      </div>
      <h1 className="text-4xl sm:text-7xl">{gym.name}</h1>
      <p className="mt-2 text-lg text-fog"><Flag code={gym.countryCode} /> {gym.city}{gym.state ? `, ${gym.state}` : ""}, {gym.country.name}{gym.foundedYear ? ` · Est. ${gym.foundedYear}` : ""}</p>
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-10">
          <p className="max-w-3xl text-lg leading-relaxed text-bone/85">{gym.description}</p>
          <section aria-labelledby="g-prog">
            <h2 id="g-prog" className="mb-3 text-3xl">Training programmes</h2>
            {gym.programs.length ? <ul className="grid gap-2 sm:grid-cols-2">{gym.programs.map((p) => <li key={p} className="card border-l-2 border-l-red p-3 text-sm font-semibold">{p}</li>)}</ul> : <p className="text-sm text-fog">Contact the gym for programme details.</p>}
          </section>
          <section aria-labelledby="g-f">
            <h2 id="g-f" className="mb-4 text-3xl">ACL fighters from this gym</h2>
            {fighters.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{fighters.map((f) => <FighterCardView key={f.id} fighter={f} />)}</div> : <EmptyState title="No ACL fighters yet" body="Fighters from this gym can apply through the scouting portal." action={{ href: "/apply", label: "Apply" }} />}
          </section>
          <section aria-labelledby="g-ph">
            <h2 id="g-ph" className="mb-4 text-3xl">Photos</h2>
            {gym.photos.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{gym.photos.map((p) => <div key={p.id} className="aspect-square overflow-hidden border border-line"><Artwork src={p.url} alt={p.caption} /></div>)}</div> : <p className="card p-4 text-sm text-fog">This gym has not uploaded photos yet.</p>}
          </section>
        </div>
        <aside className="space-y-6">
          <section className="card p-4" aria-labelledby="g-c">
            <h2 id="g-c" className="mb-3 text-2xl">Contact</h2>
            <dl className="space-y-2 text-sm">
              {gym.address && <div><dt className="text-xs uppercase tracking-widest text-fog">Address</dt><dd>{gym.address}</dd></div>}
              {gym.phone && <div><dt className="text-xs uppercase tracking-widest text-fog">Phone</dt><dd><a href={`tel:${gym.phone.replace(/\s/g, "")}`} className="hover:text-gold">{gym.phone}</a></dd></div>}
              {gym.email && <div><dt className="text-xs uppercase tracking-widest text-fog">Email</dt><dd><a href={`mailto:${gym.email}`} className="break-all hover:text-gold">{gym.email}</a></dd></div>}
              {gym.website && <div><dt className="text-xs uppercase tracking-widest text-fog">Website</dt><dd><a href={gym.website} target="_blank" rel="noopener noreferrer" className="break-all hover:text-gold">{gym.website}</a></dd></div>}
            </dl>
          </section>
          <section className="card p-4" aria-labelledby="g-co">
            <h2 id="g-co" className="mb-3 text-2xl">Coaches</h2>
            {gym.coaches.length ? <ul className="space-y-3">{gym.coaches.map((c) => <li key={c.id}><p className="font-semibold">{c.name}</p>{c.bio && <p className="text-sm text-fog">{c.bio}</p>}</li>)}</ul> : <p className="text-sm text-fog">No coaches listed.</p>}
          </section>
          <Link href="/apply" className="btn btn-red w-full">Become an ACL fighter</Link>
        </aside>
      </div>
    </article>
  );
}
