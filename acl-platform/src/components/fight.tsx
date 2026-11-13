import Link from "next/link";
import type { FighterCard } from "@/server/services/fighters";
import { FighterPortrait } from "./media";
import { cx, Flag } from "./ui";
import { age, cmToFeet, label } from "@/lib/format";

/** Two fighters squared up. The signature ACL visual, reused in heroes and fight pages. */
export function FaceOff({ a, b, winnerId, size = "lg", children }: { a: FighterCard; b: FighterCard; winnerId?: string | null; size?: "lg" | "md"; children?: React.ReactNode }) {
  const side = (f: FighterCard, right: boolean) => {
    const lost = !!winnerId && winnerId !== f.id;
    return (
      <Link href={`/fighters/${f.slug}`} className={cx("group relative min-w-0 flex-1", right && "text-right")}>
        <div className={cx("relative overflow-hidden", size === "lg" ? "aspect-[4/5] sm:aspect-[5/6]" : "aspect-[4/5]", lost && "opacity-60 grayscale")}>
          <div className="h-full w-full transition-transform duration-700 group-hover:scale-[1.03]">
            <FighterPortrait fighter={f} champion={f.isChampion} flip={right} priority />
          </div>
        </div>
        <div className={cx("absolute inset-x-0 bottom-0 p-2 sm:p-4", right && "items-end")}>
          {f.nickname && <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-gold sm:text-xs">“{f.nickname}”</p>}
          <p className={cx("display leading-[0.9]", size === "lg" ? "text-2xl sm:text-5xl lg:text-6xl" : "text-xl sm:text-4xl")}>{f.lastName}</p>
          <p className="mt-1 text-[0.7rem] text-bone/80 sm:text-sm">
            <Flag code={f.countryCode} name={f.country.name} /> {f.record.wins}–{f.record.losses}–{f.record.draws}
            {f.isChampion ? " · Champion" : f.ranking ? ` · #${f.ranking.rank}` : ""}
          </p>
          {winnerId === f.id && <span className="chip chip-gold mt-1.5">Winner</span>}
        </div>
      </Link>
    );
  };
  return (
    <div className="relative flex items-stretch gap-1 sm:gap-2">
      {side(a, false)}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-center">
        {children ?? <span className="display block bg-red px-2 py-0.5 text-2xl text-white shadow-lg sm:px-3 sm:text-4xl">VS</span>}
      </div>
      {side(b, true)}
    </div>
  );
}

function Row({ labelText, a, b, better }: { labelText: string; a: React.ReactNode; b: React.ReactNode; better?: "a" | "b" | null }) {
  return (
    <tr className="border-b border-line/70">
      <td className={cx("w-[38%] py-2.5 text-right text-sm font-semibold sm:text-base", better === "a" && "text-gold")}>{a}</td>
      <th scope="row" className="px-2 py-2.5 text-center text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-fog sm:text-xs">{labelText}</th>
      <td className={cx("w-[38%] py-2.5 text-sm font-semibold sm:text-base", better === "b" && "text-gold")}>{b}</td>
    </tr>
  );
}

const hi = (x: number, y: number) => (x === y ? null : x > y ? "a" : "b");

export function TaleOfTape({ a, b, at }: { a: FighterCard & { gym?: { name: string } | null }; b: FighterCard & { gym?: { name: string } | null }; at?: Date }) {
  const ageA = age(a.dateOfBirth, at), ageB = age(b.dateOfBirth, at);
  return (
    <table className="w-full table-fixed border-t border-line">
      <caption className="sr-only">Tale of the tape: {a.lastName} versus {b.lastName}</caption>
      <thead>
        <tr className="border-b border-line">
          <th scope="col" className="display py-3 text-right text-xl sm:text-2xl">{a.lastName}</th>
          <th scope="col" className="display py-3 text-center text-sm text-red">Tale of the tape</th>
          <th scope="col" className="display py-3 text-left text-xl sm:text-2xl">{b.lastName}</th>
        </tr>
      </thead>
      <tbody>
        <Row labelText="Record" a={`${a.record.wins}–${a.record.losses}–${a.record.draws}`} b={`${b.record.wins}–${b.record.losses}–${b.record.draws}`} />
        <Row labelText="KOs" a={a.record.kos} b={b.record.kos} better={hi(a.record.kos, b.record.kos)} />
        <Row labelText="KO %" a={`${a.record.koPct}%`} b={`${b.record.koPct}%`} better={hi(a.record.koPct, b.record.koPct)} />
        <Row labelText="Win %" a={`${a.record.winPct}%`} b={`${b.record.winPct}%`} better={hi(a.record.winPct, b.record.winPct)} />
        <Row labelText="Age" a={ageA} b={ageB} />
        <Row labelText="Height" a={`${a.heightCm} cm (${cmToFeet(a.heightCm)})`} b={`${b.heightCm} cm (${cmToFeet(b.heightCm)})`} better={hi(a.heightCm, b.heightCm)} />
        <Row labelText="Reach" a={`${a.reachCm} cm`} b={`${b.reachCm} cm`} better={hi(a.reachCm, b.reachCm)} />
        <Row labelText="Stance" a={label(a.stance)} b={label(b.stance)} />
        <Row labelText="Style" a={a.style} b={b.style} />
        <Row labelText="Ranking" a={a.isChampion ? "Champion" : a.ranking ? `#${a.ranking.rank}` : "Unranked"} b={b.isChampion ? "Champion" : b.ranking ? `#${b.ranking.rank}` : "Unranked"} />
        <Row labelText="Nationality" a={<><Flag code={a.countryCode} /> {a.country.name}</>} b={<><Flag code={b.countryCode} /> {b.country.name}</>} />
        {(a.gym || b.gym) && <Row labelText="Gym" a={a.gym?.name ?? "—"} b={b.gym?.name ?? "—"} />}
        <Row
          labelText="Recent form"
          a={<Form form={a.record.form} align="right" />}
          b={<Form form={b.record.form} />}
        />
      </tbody>
    </table>
  );
}

export function Form({ form, align }: { form: ("W" | "L" | "D")[]; align?: "right" }) {
  if (!form.length) return <span className="text-sm font-normal text-fog">No ACL bouts</span>;
  return (
    <span className={cx("inline-flex gap-1", align === "right" && "flex-row-reverse")} aria-label={`Recent results, newest first: ${form.slice(0, 5).join(", ")}`}>
      {form.slice(0, 5).map((r, i) => (
        <span key={i} className={cx("flex h-6 w-6 items-center justify-center text-xs font-bold", r === "W" ? "bg-win text-black" : r === "L" ? "bg-red text-white" : "bg-fog text-black")}>{r}</span>
      ))}
    </span>
  );
}

/** Mirrored comparison bar for a single statistic. */
export function CompareBar({ labelText, a, b, suffix = "" }: { labelText: string; a: number; b: number; suffix?: string }) {
  const max = Math.max(a, b, 1);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className={cx("font-semibold tabular-nums", a > b && "text-gold")}>{a}{suffix}</span>
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-fog">{labelText}</span>
        <span className={cx("font-semibold tabular-nums", b > a && "text-gold")}>{b}{suffix}</span>
      </div>
      <div className="grid grid-cols-2 gap-1" aria-hidden>
        <div className="flex h-2 justify-end bg-steel"><span className="bg-red" style={{ width: `${(a / max) * 100}%` }} /></div>
        <div className="flex h-2 bg-steel"><span className="bg-bone" style={{ width: `${(b / max) * 100}%` }} /></div>
      </div>
    </div>
  );
}
