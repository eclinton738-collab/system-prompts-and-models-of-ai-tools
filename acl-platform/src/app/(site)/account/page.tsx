import Link from "next/link";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { getPassport } from "@/server/services/engagement";
import { getFighterCards } from "@/server/services/fighters";
import { listFights } from "@/server/services/fights";
import { FighterCardView, FightRow, VideoCard } from "@/components/cards";
import { EmptyState, Flag, Stat } from "@/components/ui";
import { fmtDate, label } from "@/lib/format";

export const metadata = { title: "ACL Passport" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireUser("/account");
  const [p, follows, favs, watchlist, recentPoints, application] = await Promise.all([
    getPassport(user.id),
    db.follow.findMany({ where: { userId: user.id }, select: { fighterId: true } }),
    db.eventFavorite.findMany({ where: { userId: user.id }, include: { event: true } }),
    db.watchlistItem.findMany({ where: { userId: user.id }, include: { video: true }, orderBy: { createdAt: "desc" }, take: 6 }),
    db.pointEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.application.findFirst({ where: { userId: user.id }, select: { status: true } }),
  ]);
  const ids = follows.map((f) => f.fighterId);
  const [fighters, upcoming] = await Promise.all([ids.length ? getFighterCards({ id: { in: ids } }) : [], listFights({ status: "SCHEDULED" })]);
  const yourFights = upcoming.filter((f) => ids.includes(f.fighterAId) || ids.includes(f.fighterBId));
  const earned = new Set(p.badges.map((b) => b.badgeId));
  return (
    <div className="space-y-12">
      {(await searchParams).denied && <p role="alert" className="border border-red/50 bg-red/10 p-3 text-sm">Your account does not have access to that area.</p>}
      <section aria-labelledby="passport" className="relative overflow-hidden border border-gold/50 bg-gradient-to-br from-gold/15 via-coal to-coal p-5 sm:p-8">
        <span aria-hidden className="display absolute -right-4 -top-8 text-[10rem] leading-none text-white/5">ACL</span>
        <p className="eyebrow">ACL Passport</p>
        <h1 id="passport" className="mt-1 text-4xl sm:text-6xl">{user.name}</h1>
        <p className="mt-1 text-sm text-fog"><Flag code={user.countryCode} /> @{user.handle} · Member since {fmtDate(user.createdAt)} · {user.premium ? "Premium member" : "Free member"}</p>
        <div className="mt-6 max-w-xl">
          <div className="flex items-end justify-between"><p className="display text-4xl text-gold sm:text-5xl">{p.rank.name}</p><p className="display text-3xl tabular-nums">{p.points.toLocaleString("en")} <span className="text-base text-fog">pts</span></p></div>
          <div className="mt-2 h-2 bg-black/50" role="progressbar" aria-valuenow={p.rank.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to next fan rank"><div className="h-2 bg-gold" style={{ width: `${p.rank.progress}%` }} /></div>
          <p className="mt-1.5 text-xs text-fog">{p.rank.next ? `${p.rank.toNext.toLocaleString("en")} points to ${p.rank.next}` : "Top rank reached"}</p>
        </div>
      </section>

      <section aria-label="Passport stamps" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Events attended" value={p.eventsAttended} /><Stat label="Fights watched" value={p.fightsWatched} /><Stat label="Fighters followed" value={p.follows} />
        <Stat label="Predictions" value={p.predictions} sub={`${p.correct} correct`} /><Stat label="Purchases" value={p.purchases} /><Stat label="Badges" value={`${p.badges.length}/${p.allBadges.length}`} accent />
      </section>

      <section aria-labelledby="your-acl">
        <h2 id="your-acl" className="mb-4 text-3xl">Your ACL</h2>
        {yourFights.length ? <div className="grid gap-3 lg:grid-cols-2">{yourFights.map((f) => <FightRow key={f.id} fight={f} />)}</div> : <p className="card p-4 text-sm text-fog">{ids.length ? "None of the fighters you follow are booked right now. You will be notified when they are." : "Follow fighters to build a personal feed of their fights, news and videos."}</p>}
      </section>

      <section aria-labelledby="badges">
        <h2 id="badges" className="mb-4 text-3xl">Badges</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {p.allBadges.map((b) => {
            const has = earned.has(b.id);
            return <li key={b.id} className={`card p-4 text-center ${has ? "border-gold/60" : "opacity-45"}`}><div aria-hidden className={`mx-auto mb-2 flex h-12 w-12 rotate-45 items-center justify-center border-2 ${has ? "border-gold bg-gold/20" : "border-line"}`}><span className="-rotate-45 text-lg">{has ? "★" : "?"}</span></div><p className="display text-lg leading-none">{b.name}</p><p className="mt-1 text-xs text-fog">{b.description}</p><p className="mt-1 text-[0.62rem] font-bold uppercase tracking-widest">{has ? "Unlocked" : "Locked"}</p></li>;
          })}
        </ul>
      </section>

      <section aria-labelledby="fav-f">
        <div className="mb-4 flex items-end justify-between"><h2 id="fav-f" className="text-3xl">Favourite fighters</h2><Link href="/fighters" className="text-sm font-semibold uppercase tracking-widest text-fog hover:text-gold">Find more →</Link></div>
        {fighters.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{fighters.map((f) => <FighterCardView key={f.id} fighter={f} />)}</div> : <EmptyState title="You are not following anyone yet" action={{ href: "/fighters", label: "Browse fighters" }} />}
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="wl">
          <h2 id="wl" className="mb-4 text-3xl">Watchlist</h2>
          {watchlist.length ? <div className="grid grid-cols-2 gap-4">{watchlist.map((w) => <VideoCard key={w.videoId} video={w.video} />)}</div> : <p className="card p-4 text-sm text-fog">Save videos from <Link href="/watch" className="text-gold underline">ACL Watch</Link> to watch later.</p>}
          <h2 className="mb-3 mt-8 text-3xl">Saved events</h2>
          {favs.length ? <ul className="space-y-2">{favs.map((f) => <li key={f.eventId}><Link href={`/events/${f.event.slug}`} className="card card-hover block p-3 font-semibold">{f.event.name}<span className="block text-xs font-normal text-fog">{fmtDate(f.event.startsAt)} · {f.event.city}</span></Link></li>)}</ul> : <p className="card p-4 text-sm text-fog">No saved events.</p>}
        </section>
        <section aria-labelledby="pts">
          <h2 id="pts" className="mb-4 text-3xl">Recent fan points</h2>
          {recentPoints.length ? <ul className="divide-y divide-line border-y border-line">{recentPoints.map((e) => <li key={e.id} className="flex items-center justify-between py-2.5 text-sm"><span>{label(e.reason)}<span className="block text-xs text-fog">{fmtDate(e.createdAt)}</span></span><span className="display text-2xl text-gold">+{e.points}</span></li>)}</ul> : <p className="text-sm text-fog">No points yet.</p>}
          <Link href="/leaderboard" className="btn btn-ghost btn-sm mt-4">Leaderboard</Link>
          {application && <Link href="/portal" className="card card-hover mt-6 block p-4"><p className="eyebrow">Fighter application</p><p className="display text-2xl">Status: {label(application.status)} →</p></Link>}
        </section>
      </div>
    </div>
  );
}
