import Link from "next/link";
import type { FighterCard } from "@/server/services/fighters";
import type { FightCard } from "@/server/services/fights";
import { resultLine } from "@/server/services/fights";
import { Artwork, BeltIcon, FighterPortrait } from "./media";
import { cx, Flag, LiveBadge } from "./ui";
import { duration, fmtDateShort, fmtDay, fmtMonthShort, fmtTime, label, timeAgo, compact } from "@/lib/format";

export function RankChip({ fighter }: { fighter: Pick<FighterCard, "isChampion" | "ranking"> }) {
  if (fighter.isChampion) return <span className="chip chip-gold">Champion</span>;
  if (fighter.ranking) return <span className="chip chip-outline">#{fighter.ranking.rank}</span>;
  return null;
}

export function FighterCardView({ fighter, followers }: { fighter: FighterCard; followers?: number }) {
  const r = fighter.record;
  return (
    <Link href={`/fighters/${fighter.slug}`} className="card card-hover group relative block overflow-hidden">
      <div className="relative aspect-[4/5] overflow-hidden bg-steel">
        <div className="h-full w-full transition-transform duration-500 group-hover:scale-105">
          <FighterPortrait fighter={fighter} champion={fighter.isChampion} />
        </div>
        <div className="absolute left-2 top-2 flex gap-1.5">
          <RankChip fighter={fighter} />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-3">
          {fighter.nickname && <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-gold">“{fighter.nickname}”</p>}
          <p className="display text-2xl leading-none sm:text-3xl">
            <span className="block text-base font-semibold text-white/80">{fighter.firstName}</span>
            {fighter.lastName}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
        <span className="tabular-nums font-semibold">
          {r.wins}–{r.losses}–{r.draws} <span className="font-normal text-fog">· {r.kos} KO</span>
        </span>
        <span className="flex items-center gap-1.5 truncate text-xs text-fog">
          <Flag code={fighter.countryCode} name={fighter.country.name} /> {fighter.division.name}
        </span>
      </div>
      {followers != null && <p className="border-t border-line px-3 py-1.5 text-xs text-fog">{compact(followers)} followers</p>}
    </Link>
  );
}

function Side({ fighter, align, won, lost }: { fighter: FighterCard; align: "left" | "right"; won: boolean; lost: boolean }) {
  return (
    <div className={cx("flex min-w-0 flex-1 items-center gap-3", align === "right" && "flex-row-reverse text-right")}>
      <div className={cx("h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-steel sm:h-16 sm:w-16", lost && "opacity-50 grayscale")}>
        <FighterPortrait fighter={fighter} champion={fighter.isChampion} flip={align === "right"} />
      </div>
      <div className="min-w-0">
        <p className={cx("display truncate text-xl leading-none sm:text-2xl", lost && "text-fog")}>
          {fighter.lastName} {won && <span className="align-middle text-xs tracking-widest text-win">WIN</span>}
        </p>
        <p className="mt-1 truncate text-xs text-fog">
          <Flag code={fighter.countryCode} name={fighter.country.name} /> {fighter.record.wins}–{fighter.record.losses}–{fighter.record.draws}
          {fighter.isChampion ? " · C" : fighter.ranking ? ` · #${fighter.ranking.rank}` : ""}
        </p>
      </div>
    </div>
  );
}

export function FightRow({ fight, showEvent = true }: { fight: FightCard; showEvent?: boolean }) {
  const done = fight.status === "COMPLETED";
  const result = resultLine(fight);
  return (
    <Link href={`/fights/${fight.slug}`} className="card card-hover block">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-fog sm:px-4">
        <span className="flex min-w-0 items-center gap-2">
          {fight.status === "LIVE" && <LiveBadge />}
          {fight.position !== "UNDERCARD" && <span className="text-red">{fight.position === "MAIN_EVENT" ? "Main event" : "Co-main"}</span>}
          <span className="truncate">{fight.division.name} · {fight.rounds} rds</span>
        </span>
        {fight.isTitleFight && (
          <span className="flex shrink-0 items-center gap-1.5 text-gold">
            <BeltIcon className="h-3.5 w-7" /> Title
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4">
        <Side fighter={fight.fighterA} align="left" won={done && fight.winnerId === fight.fighterA.id} lost={done && !!fight.winnerId && fight.winnerId !== fight.fighterA.id} />
        <span className="display shrink-0 text-lg text-red sm:text-2xl">VS</span>
        <Side fighter={fight.fighterB} align="right" won={done && fight.winnerId === fight.fighterB.id} lost={done && !!fight.winnerId && fight.winnerId !== fight.fighterB.id} />
      </div>
      {(showEvent || result) && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line px-3 py-2 text-xs text-fog sm:px-4">
          {result ? <span className="font-semibold text-bone">{result}</span> : <span>{fmtDateShort(fight.event.startsAt)}</span>}
          {showEvent && <span className="truncate">{fight.event.name}</span>}
        </div>
      )}
    </Link>
  );
}

type EventLike = { slug: string; name: string; tagline: string | null; type: string; startsAt: Date; venue: string; city: string; status: string; posterUrl: string | null; countryCode: string; country: { name: string } };

export function DateBlock({ date }: { date: Date }) {
  return (
    <div className="flex w-14 shrink-0 flex-col items-center justify-center bg-red py-2 text-white">
      <span className="display text-3xl leading-none">{fmtDay(date)}</span>
      <span className="text-[0.65rem] font-bold tracking-[0.18em]">{fmtMonthShort(date)}</span>
    </div>
  );
}

export function EventCardView({ event }: { event: EventLike }) {
  return (
    <Link href={`/events/${event.slug}`} className="card card-hover flex overflow-hidden">
      <DateBlock date={event.startsAt} />
      <div className="min-w-0 flex-1 p-3 sm:p-4">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          {event.status === "LIVE" ? <LiveBadge /> : event.status === "COMPLETED" ? <span className="chip chip-outline">Results</span> : event.status === "CANCELLED" ? <span className="chip chip-outline">Cancelled</span> : null}
          {event.type !== "FIGHT_NIGHT" && <span className="chip">{label(event.type)}</span>}
        </div>
        <p className="display text-xl leading-none sm:text-2xl">{event.name}</p>
        <p className="mt-1.5 truncate text-sm text-fog">
          <Flag code={event.countryCode} name={event.country.name} /> {event.venue}, {event.city} · {fmtTime(event.startsAt)}
        </p>
      </div>
    </Link>
  );
}

type ArticleLike = { slug: string; title: string; excerpt: string; category: string; coverUrl: string | null; publishedAt: Date };

export function ArticleCard({ article, large }: { article: ArticleLike; large?: boolean }) {
  return (
    <Link href={`/news/${article.slug}`} className="card card-hover group flex h-full flex-col overflow-hidden">
      <div className={cx("overflow-hidden", large ? "aspect-[16/9]" : "aspect-[16/9]")}>
        <Artwork src={article.coverUrl} alt="" seed={article.slug} tone={article.category === "BREAKING_NEWS" ? "red" : "steel"} kicker={label(article.category)} />
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className={cx("display leading-[1.02]", large ? "text-2xl sm:text-4xl" : "text-xl sm:text-2xl")}>{article.title}</p>
        <p className={cx("mt-2 text-sm text-fog", large ? "line-clamp-3" : "line-clamp-2")}>{article.excerpt}</p>
        <p className="mt-auto pt-3 text-xs uppercase tracking-widest text-fog">{timeAgo(article.publishedAt)}</p>
      </div>
    </Link>
  );
}

type VideoLike = { slug: string; title: string; category: string; durationSec: number; thumbnailUrl: string | null; premium: boolean; publishedAt: Date };

export function VideoCard({ video, wide }: { video: VideoLike; wide?: boolean }) {
  return (
    <Link href={`/watch/${video.slug}`} className={cx("group block", wide ? "w-[78vw] max-w-sm sm:w-80" : "")}>
      <div className="relative aspect-video overflow-hidden border border-line bg-steel transition-colors group-hover:border-gold/60">
        <Artwork src={video.thumbnailUrl} alt="" seed={video.slug} tone={video.category === "DOCUMENTARY" ? "gold" : video.category === "FULL_FIGHTS" ? "steel" : "red"} label={video.title} />
        <span aria-hidden className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/40 transition-transform group-hover:scale-110">
          <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        </span>
        <span className="absolute bottom-1.5 right-1.5 bg-black/80 px-1.5 py-0.5 text-[0.7rem] font-semibold tabular-nums">{duration(video.durationSec)}</span>
        {video.premium && <span className="chip chip-gold absolute left-1.5 top-1.5">Premium</span>}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug group-hover:text-gold">{video.title}</p>
      <p className="mt-0.5 text-xs uppercase tracking-widest text-fog">{label(video.category)} · {timeAgo(video.publishedAt)}</p>
    </Link>
  );
}

export function ProductCard({ product, price }: { product: { slug: string; name: string; category: string; imageUrl: string | null; inventory: number; limited: boolean }; price: string }) {
  return (
    <Link href={`/shop/${product.slug}`} className="card card-hover group block overflow-hidden">
      <div className="relative aspect-square overflow-hidden">
        <Artwork src={product.imageUrl} alt="" seed={product.slug} tone={product.limited || product.category === "CHAMPIONSHIP" ? "gold" : "steel"} kicker={label(product.category)} label={product.name} />
        {product.inventory === 0 ? <span className="chip absolute left-2 top-2 bg-black/80">Sold out</span> : product.limited ? <span className="chip chip-gold absolute left-2 top-2">Limited</span> : null}
      </div>
      <div className="p-3">
        <p className="line-clamp-1 text-sm font-semibold group-hover:text-gold">{product.name}</p>
        <p className="mt-0.5 text-sm text-fog">{price}</p>
      </div>
    </Link>
  );
}

export function GymCard({ gym }: { gym: { slug: string; name: string; city: string; state: string | null; countryCode: string; country: { name: string }; disciplines: string[]; aclAffiliated: boolean } }) {
  return (
    <Link href={`/gyms/${gym.slug}`} className="card card-hover block p-4">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {gym.aclAffiliated && <span className="chip chip-gold">ACL affiliated</span>}
        {gym.disciplines.map((d) => <span key={d} className="chip">{d}</span>)}
      </div>
      <p className="display text-2xl leading-none">{gym.name}</p>
      <p className="mt-1.5 text-sm text-fog">
        <Flag code={gym.countryCode} name={gym.country.name} /> {gym.city}{gym.state ? `, ${gym.state}` : ""} · {gym.country.name}
      </p>
    </Link>
  );
}
