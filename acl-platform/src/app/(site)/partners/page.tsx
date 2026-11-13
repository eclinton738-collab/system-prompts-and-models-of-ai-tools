import type { Metadata } from "next";
import { db } from "@/server/db";
import { ApiForm } from "@/components/client/ApiForm";
import { Stat } from "@/components/ui";
import { compact, label } from "@/lib/format";

export const metadata: Metadata = { title: "Partner with ACL", description: "Sponsorship and advertising with Africa Combat League: events, digital media, fighter partnerships and brand integration across Africa.", alternates: { canonical: "/partners" } };

const OPPS = [
  ["Event sponsorship", "Title, presenting and official partner positions for fight nights and State Wars cards: ring canvas, corner pads, LED, hospitality."],
  ["Digital media", "Pre-roll and sponsorship on ACL Watch, branded series, newsletter and social inventory."],
  ["Fighter partnerships", "Ambassador deals and co-branded content with ACL athletes, managed through the league."],
  ["Brand integration", "Rankings, tale of the tape, knockout of the night and fan prediction features presented by your brand."],
  ["Advertising", "Display placements across the ACL website and app, targeted by country."],
  ["Community & grassroots", "Gym programmes, scouting days and fan events in the cities where your customers live."],
];

export default async function PartnersPage() {
  const since = new Date(Date.now() - 30 * 864e5);
  const [sponsors, fans, countries, views, events, videoViews] = await Promise.all([
    db.sponsor.findMany({ where: { active: true }, orderBy: { tier: "asc" } }),
    db.user.count({ where: { role: "FAN" } }),
    db.analyticsEvent.findMany({ where: { type: "page_view", createdAt: { gte: since }, country: { not: null } }, distinct: ["country"], select: { country: true } }),
    db.analyticsEvent.count({ where: { type: "page_view", createdAt: { gte: since } } }),
    db.event.count({ where: { type: "FIGHT_NIGHT" } }),
    db.video.aggregate({ _sum: { views: true } }),
  ]);
  return (
    <>
      <header className="relative overflow-hidden border-b border-line bg-coal">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(214,171,59,0.25),transparent_60%)]" />
        <div className="container-acl relative py-10 sm:py-16">
          <p className="eyebrow">For brands</p>
          <h1 className="mt-1 max-w-4xl text-5xl sm:text-8xl">Partner with ACL</h1>
          <p className="mt-4 max-w-2xl text-lg text-fog">Reach young, mobile, passionate sports fans across Africa through the continent’s combat-sports league.</p>
          <a href="#inquiry" className="btn btn-gold btn-lg mt-6">Contact sales</a>
        </div>
      </header>
      <div className="container-acl space-y-14 py-8 sm:py-12">
        <section aria-labelledby="aud">
          <h2 id="aud" className="mb-2 text-3xl sm:text-4xl">Audience & reach</h2>
          <p className="mb-5 text-sm text-fog">Live figures from the ACL platform (this prototype runs on demo data).</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat label="Page views · 30 days" value={compact(views)} accent /><Stat label="Registered fans" value={compact(fans)} /><Stat label="Countries reached" value={countries.length} /><Stat label="Video views" value={compact(videoViews._sum.views ?? 0)} /><Stat label="Fight nights staged & scheduled" value={events} />
          </div>
        </section>
        <section aria-labelledby="opp">
          <h2 id="opp" className="mb-5 text-3xl sm:text-4xl">Sponsorship opportunities</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{OPPS.map(([t, d]) => <li key={t} className="card border-t-2 border-t-gold p-5"><p className="display text-2xl">{t}</p><p className="mt-2 text-sm text-fog">{d}</p></li>)}</ul>
        </section>
        {sponsors.length > 0 && (
          <section aria-labelledby="cur">
            <h2 id="cur" className="mb-5 text-3xl sm:text-4xl">Current partners</h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{sponsors.map((s) => <li key={s.id} className="card p-4 text-center"><p className="display text-xl">{s.name}</p><p className="mt-1 text-[0.62rem] font-bold uppercase tracking-widest text-gold">{label(s.tier)} partner</p></li>)}</ul>
          </section>
        )}
        <section id="inquiry" aria-labelledby="inq" className="max-w-3xl scroll-mt-20">
          <h2 id="inq" className="mb-2 text-3xl sm:text-4xl">Sponsorship inquiry</h2>
          <p className="mb-5 text-fog">Tell us about your brand and goals. The partnerships team replies within two working days.</p>
          <div className="card p-5 sm:p-6">
            <ApiForm endpoint="/api/v1/sponsor-inquiries" resetOnSuccess submitLabel="Send inquiry" successMessage="Thank you — our partnerships team will be in touch."
              fields={[
                { name: "company", label: "Company", required: true, half: true, autoComplete: "organization" }, { name: "name", label: "Your name", required: true, half: true, autoComplete: "name" },
                { name: "email", label: "Work email", type: "email", required: true, half: true, autoComplete: "email" }, { name: "phone", label: "Phone", type: "tel", half: true, autoComplete: "tel" },
                { name: "country", label: "Country / market", half: true }, { name: "budget", label: "Indicative annual budget", type: "select", half: true, options: ["Under $10k", "$10k–$50k", "$50k–$250k", "$250k+", "Not sure yet"].map((v) => ({ value: v, label: v })) },
                { name: "interests", label: "Interested in", type: "multiselect", options: OPPS.map(([t]) => ({ value: t, label: t })) },
                { name: "message", label: "What are you looking to achieve?", type: "textarea", required: true },
              ]} />
          </div>
        </section>
      </div>
    </>
  );
}
