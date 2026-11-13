import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { RivalryGrid } from "@/components/RivalryGrid";
import { VoteBar } from "@/components/client/Engage";
import { getCurrentUser } from "@/server/auth";
import { EventCardView } from "@/components/cards";
import { EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "ACL State Wars", description: "State against state, city against city, nation against nation. ACL State Wars turns Africa's regional pride into fight cards.", alternates: { canonical: "/state-wars" } };

export default async function StateWarsPage() {
  const user = await getCurrentUser();
  const [regions, events, poll] = await Promise.all([
    db.rivalry.findMany({ where: { type: "REGION" }, orderBy: { featured: "desc" }, include: { _count: { select: { votes: true, moments: true } } } }),
    db.event.findMany({ where: { sideA: { not: null }, type: "FIGHT_NIGHT" }, orderBy: { startsAt: "desc" }, include: { country: true } }),
    db.poll.findFirst({ where: { active: true, question: { contains: "State Wars" } }, include: { options: { include: { _count: { select: { votes: true } } } }, votes: user ? { where: { userId: user.id } } : false } }),
  ]);
  return (
    <>
      <header className="relative overflow-hidden border-b border-line bg-coal">
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(100deg,rgba(227,24,45,0.3)_0%,transparent_45%,transparent_55%,rgba(214,171,59,0.22)_100%)]" />
        <div className="container-acl relative py-12 text-center sm:py-20">
          <p className="eyebrow">An ACL series</p>
          <h1 className="mt-1 text-6xl sm:text-9xl">State Wars</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-fog">Fighters represent where they are from. Abia vs Imo. Aba vs Owerri. Lagos vs Abuja. Ghana vs Nigeria. The side with more wins on the night takes the shield home.</p>
        </div>
      </header>
      <div className="container-acl space-y-12 py-8 sm:py-12">
        <section aria-labelledby="sw-events">
          <h2 id="sw-events" className="mb-5 text-3xl sm:text-4xl">State Wars events</h2>
          {events.length ? <div className="grid gap-3 lg:grid-cols-2">{events.map((e) => <EventCardView key={e.id} event={e} />)}</div> : <EmptyState title="The first State Wars card is being planned" />}
        </section>
        <section aria-labelledby="sw-riv">
          <h2 id="sw-riv" className="mb-5 text-3xl sm:text-4xl">The wars</h2>
          {regions.length ? <RivalryGrid rivalries={regions} /> : <EmptyState title="No regional rivalries yet" />}
        </section>
        {poll && (
          <section aria-labelledby="sw-poll" className="card max-w-2xl p-5">
            <p className="eyebrow">Fan vote</p>
            <h2 id="sw-poll" className="mb-4 mt-1 text-3xl">{poll.question}</h2>
            <VoteBar endpoint={`/api/v1/polls/${poll.id}/vote`} label={poll.question} mine={(poll.votes as { optionId: string }[] | undefined)?.[0]?.optionId ?? null} options={poll.options.map((o) => ({ key: o.id, label: o.label, count: o._count.votes }))} />
          </section>
        )}
        <p className="text-sm text-fog">Want your state on the card? <Link href="/apply" className="text-gold underline">Fighters apply here</Link> · <Link href="/partners" className="text-gold underline">States and brands partner here</Link>.</p>
      </div>
    </>
  );
}
