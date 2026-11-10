"use client";

import { CalendarDays, MapPin, Building2, Users } from "lucide-react";
import { date } from "@/lib/format";
import { useNow, useOps } from "../ops-provider";
import { StatusBadge } from "../shell/app-shell";

function useCountdown() {
  const { s } = useOps();
  const now = useNow();
  const marks: [string, number][] = [["Doors open in", Date.parse(s.event.doorsOpenAt)], ["Main card walkouts in", Date.parse(s.event.mainCardAt)], ["Event closes in", Date.parse(s.event.endsAt)]];
  const next = marks.find(([, t]) => t > now);
  if (!next) return { label: "Event ended", parts: null };
  const d = Math.max(0, next[1] - now);
  const p = (n: number) => String(Math.floor(n)).padStart(2, "0");
  return { label: next[0], parts: [[p(d / 86_400_000), "Days"], [p((d / 3_600_000) % 24), "Hrs"], [p((d / 60_000) % 60), "Min"], [p((d / 1000) % 60), "Sec"]] as [string, string][] };
}

/** Dashboard masthead: event identity, status, and the live countdown. */
export function EventHero() {
  const { s } = useOps();
  const e = s.event;
  const c = useCountdown();
  return (
    <section className="arena relative overflow-hidden border border-ink-600">
      {/* Cage silhouette */}
      <svg aria-hidden viewBox="0 0 400 400" className="pointer-events-none absolute -right-16 -top-24 h-[420px] w-[420px] opacity-[0.16]">
        <g fill="none" stroke="#fff" strokeWidth="1.5">
          <path d="M124 20h152l104 104v152L276 380H124L20 276V124z" /><path d="M140 60h120l80 80v120l-80 80H140l-80-80V140z" /><path d="M160 108h80l52 52v80l-52 52h-80l-52-52v-80z" />
          <path d="M124 20l36 88M276 20l-36 88M380 124l-88 36M380 276l-88-36M276 380l-36-88M124 380l36-88M20 276l88-36M20 124l88 36" />
        </g>
      </svg>
      <div className="absolute inset-y-0 left-0 w-1 bg-acl" aria-hidden />
      <div className="relative flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="eyebrow text-fg-muted">ACL Event Dashboard</span>
            <StatusBadge />
          </div>
          <h1 className="h-display mt-3 text-[40px] sm:text-6xl">{e.name}</h1>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-fg-muted">
            <li className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-acl-glow" />{date(e.doorsOpenAt)}</li>
            <li className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-acl-glow" />{e.location}</li>
            <li className="flex items-center gap-1.5"><Building2 className="h-4 w-4 text-acl-glow" />{e.venue}</li>
            <li className="flex items-center gap-1.5"><Users className="h-4 w-4 text-acl-glow" />{e.capacity.toLocaleString()} Capacity</li>
          </ul>
          <p className="mt-4 font-display text-xs font-semibold uppercase tracking-[0.32em] text-fg-dim">Unchained. Unbreakable. Unbound.</p>
        </div>
        <div className="shrink-0" role="timer" aria-label={c.label}>
          <div className="eyebrow mb-2 text-fg-muted lg:text-right">{c.label}</div>
          {c.parts ? (
            <div className="flex gap-1.5">
              {c.parts.map(([v, l]) => (
                <div key={l} className="w-[68px] border border-tint/10 bg-black/50 py-2 text-center backdrop-blur">
                  <div className="font-display text-4xl font-bold tabular-nums leading-none">{v}</div>
                  <div className="mt-1 font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-fg-dim">{l}</div>
                </div>
              ))}
            </div>
          ) : <div className="h-display text-3xl text-fg-muted">Final bell</div>}
        </div>
      </div>
    </section>
  );
}
