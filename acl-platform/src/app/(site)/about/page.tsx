import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { Stat } from "@/components/ui";

export const metadata: Metadata = { title: "About ACL", description: "Africa Combat League is Africa's premier combat sports league: an Africa-first home for fighters, rivalries, championships and fans.", alternates: { canonical: "/about" } };

export default async function AboutPage() {
  const [fighters, countries, events, divisions, gyms] = await Promise.all([db.fighter.count({ where: { status: "ACTIVE" } }), db.fighter.findMany({ distinct: ["countryCode"], select: { countryCode: true } }), db.event.count({ where: { type: "FIGHT_NIGHT" } }), db.division.count({ where: { active: true } }), db.gym.count()]);
  const ways = [["Watch", "Live events, full fights and Originals.", "/watch"], ["Attend", "Tickets for every ACL fight night.", "/tickets"], ["Join", "Your ACL Passport: follow, predict, earn.", "/join"], ["Fight", "Apply to join the roster.", "/apply"], ["Partner", "Put your brand in the ring.", "/partners"], ["Report", "Press resources and accreditation.", "/media"]];
  return (
    <>
      <header className="relative overflow-hidden border-b border-line bg-coal">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(227,24,45,0.3),transparent_60%)]" />
        <div className="container-acl relative py-12 sm:py-24">
          <p className="eyebrow">About Africa Combat League</p>
          <h1 className="mt-1 max-w-5xl text-5xl sm:text-8xl">The home of African combat sports</h1>
          <p className="mt-5 max-w-2xl text-lg text-fog sm:text-xl">ACL is a professional boxing league built in Africa, for Africa — where fighters become stars, rivalries become stories and fight nights become events a continent stops for.</p>
        </div>
      </header>
      <div className="container-acl space-y-14 py-10 sm:py-14">
        <section aria-label="League in numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat label="Active fighters" value={fighters} accent /><Stat label="Nations represented" value={countries.length} /><Stat label="Fight nights" value={events} /><Stat label="Championship divisions" value={divisions} /><Stat label="Gyms in the directory" value={gyms} />
        </section>
        <section className="grid gap-8 lg:grid-cols-3">
          {[["Our mission", "To build combat sports into an African industry: a league that develops athletes, pays them fairly, tells their stories and gives fans a championship structure they can believe in."], ["How it works", "Fighters sign with the league and compete in weight divisions. An independent panel ranks the top ten in each. The number-one contender earns a shot at the champion. Win, and the belt is yours."], ["Africa-first", "Events priced in local currency. A site built for mobile data. Rivalries rooted in real places — states, cities and nations — through the State Wars series. Scouting in every market we enter."]].map(([t, b]) => <div key={t}><h2 className="mb-3 text-3xl">{t}</h2><p className="leading-relaxed text-bone/85">{b}</p></div>)}
        </section>
        <section aria-labelledby="ways">
          <h2 id="ways" className="mb-5 text-3xl sm:text-4xl">Be part of ACL</h2>
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-6">{ways.map(([t, d, h]) => <li key={t}><Link href={h} className="card card-hover block h-full p-4"><p className="display text-3xl text-red">{t}</p><p className="mt-1 text-sm text-fog">{d}</p></Link></li>)}</ul>
        </section>
        <section className="flex flex-wrap gap-3"><Link href="/originals" className="btn btn-gold">Watch “The Vision”</Link><Link href="/contact" className="btn btn-ghost">Contact</Link><Link href="/careers" className="btn btn-ghost">Careers</Link></section>
      </div>
    </>
  );
}
