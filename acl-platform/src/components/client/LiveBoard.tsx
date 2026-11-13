"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LiveSnapshot, LiveFight } from "@/server/services/live";
import { flag, methodLabel } from "@/lib/format";

function useClock(f: LiveFight | null, serverOffset: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!f?.clockRunning) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [f?.clockRunning]);
  if (!f || f.clockSeconds == null) return null;
  let s = f.clockSeconds;
  if (f.clockRunning && f.clockUpdatedAt) s -= Math.floor((now + serverOffset - new Date(f.clockUpdatedAt).getTime()) / 1000);
  s = Math.max(0, s);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function StatRow({ label, a, b }: { label: string; a: number; b: number }) {
  const total = a + b || 1;
  return (
    <div className="grid grid-cols-[3rem_1fr_3rem] items-center gap-2 text-sm">
      <span className="text-right font-semibold tabular-nums">{a}</span>
      <div>
        <p className="mb-1 text-center text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-fog">{label}</p>
        <div className="flex h-1.5 gap-0.5">
          <span className="bg-red" style={{ width: `${(a / total) * 100}%` }} />
          <span className="flex-1 bg-bone/70" />
        </div>
      </div>
      <span className="font-semibold tabular-nums">{b}</span>
    </div>
  );
}

/**
 * Real-time scoreboard. Subscribes to the event's Server-Sent Events stream and
 * falls back to polling on poor connections. The same snapshot contract can be
 * delivered over WebSockets to mobile and TV clients.
 */
export function LiveBoard({ eventId, initial }: { eventId: string; initial: LiveSnapshot }) {
  const router = useRouter();
  const [snap, setSnap] = useState(initial);
  const [conn, setConn] = useState<"connecting" | "live" | "polling">("connecting");
  const offset = useRef(0);
  const statusRef = useRef(initial.status);

  useEffect(() => {
    let es: EventSource | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    const apply = (s: LiveSnapshot) => {
      offset.current = new Date(s.serverTime).getTime() - Date.now();
      if (s.status !== statusRef.current) {
        statusRef.current = s.status;
        router.refresh(); // page layout changes between scheduled / live / completed
      }
      setSnap(s);
    };
    const startPolling = () => {
      if (poll) return;
      setConn("polling");
      poll = setInterval(async () => {
        try {
          const r = await fetch(`/api/v1/live/${eventId}`, { cache: "no-store" });
          const j = await r.json();
          if (j.data) apply(j.data);
        } catch {}
      }, 6000);
    };
    if ("EventSource" in window) {
      es = new EventSource(`/api/v1/live/${eventId}/stream`);
      es.onopen = () => setConn("live");
      es.onmessage = (e) => apply(JSON.parse(e.data));
      es.onerror = () => {
        es?.close();
        startPolling();
      };
    } else startPolling();
    return () => {
      es?.close();
      if (poll) clearInterval(poll);
    };
  }, [eventId, router]);

  const f = snap.current;
  const clock = useClock(f, offset.current);

  return (
    <section aria-label="Live scoreboard" className="border border-red/50 bg-coal">
      <div className="flex items-center justify-between gap-3 bg-red px-4 py-2 text-white">
        <span className="display flex items-center gap-2 text-xl tracking-widest">
          <span aria-hidden className="h-2 w-2 animate-pulse-live rounded-full bg-white" /> Live
        </span>
        <span className="text-[0.65rem] font-semibold uppercase tracking-widest opacity-90">{conn === "live" ? "Real-time" : conn === "polling" ? "Updating every 6s" : "Connecting…"}</span>
      </div>

      {f ? (
        <div className="p-4 sm:p-6">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-fog">
            {f.isTitleFight ? "Title fight · " : ""}{f.division.name} · {f.rounds} rounds
          </p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <Link href={`/fighters/${f.fighterA.slug}`} className="min-w-0 text-right">
              <span className="display block truncate text-2xl sm:text-5xl">{f.fighterA.lastName}</span>
              <span className="text-xs text-fog">{flag(f.fighterA.countryCode)} {f.fighterA.firstName}</span>
            </Link>
            <div className="flex flex-col items-center border border-line bg-ink px-4 py-2 sm:px-8">
              <span className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-gold">Round</span>
              <span className="display text-4xl leading-none sm:text-6xl">{f.currentRound ?? "–"}<span className="text-xl text-fog sm:text-2xl">/{f.rounds}</span></span>
              <span role="timer" aria-live="off" className="mt-1 font-mono text-lg tabular-nums sm:text-2xl">{clock ?? "--:--"}</span>
            </div>
            <Link href={`/fighters/${f.fighterB.slug}`} className="min-w-0">
              <span className="display block truncate text-2xl sm:text-5xl">{f.fighterB.lastName}</span>
              <span className="text-xs text-fog">{f.fighterB.firstName} {flag(f.fighterB.countryCode)}</span>
            </Link>
          </div>

          {f.statsA && f.statsB ? (
            <div className="mx-auto mt-6 max-w-xl space-y-3">
              <StatRow label="Punches landed" a={f.statsA.landed} b={f.statsB.landed} />
              <StatRow label="Punches thrown" a={f.statsA.thrown} b={f.statsB.thrown} />
              <StatRow label="Power punches landed" a={f.statsA.powerLanded} b={f.statsB.powerLanded} />
              <StatRow label="Body shots landed" a={f.statsA.bodyLanded} b={f.statsB.bodyLanded} />
              <StatRow label="Knockdowns" a={f.statsA.knockdowns} b={f.statsB.knockdowns} />
            </div>
          ) : (
            <p className="mt-5 text-center text-sm text-fog">Live punch statistics will appear here when supplied by the official scorers.</p>
          )}

          {f.scorecards.length > 0 && (
            <div className="mx-auto mt-6 max-w-xl">
              <p className="eyebrow mb-2 text-center">Judges’ scorecards</p>
              <ul className="grid grid-cols-3 gap-2 text-center text-sm">
                {f.scorecards.map((c) => (
                  <li key={c.judge} className="border border-line py-2">
                    <span className="display block text-2xl tabular-nums">{c.scoreA}–{c.scoreB}</span>
                    <span className="text-[0.65rem] text-fog">{c.judge}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6">
            <p className="eyebrow mb-2">Live commentary</p>
            {f.commentary.length ? (
              <ol aria-live="polite" className="max-h-64 space-y-2 overflow-y-auto pr-1 text-sm">
                {f.commentary.map((c) => (
                  <li key={c.id} className="flex gap-3 border-l-2 border-red pl-3">
                    <span className="shrink-0 text-xs font-semibold uppercase tracking-widest text-fog">{c.round ? `R${c.round}` : "—"}</span>
                    <span>{c.text}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-fog">Commentary starts at the opening bell.</p>
            )}
          </div>
        </div>
      ) : (
        <p className="p-6 text-center text-fog">Between fights. The next bout will appear here as the fighters make their walk.</p>
      )}

      <ul className="divide-y divide-line border-t border-line text-sm">
        {snap.fights.map((x) => {
          const w = x.winnerId === x.fighterA.id ? x.fighterA : x.winnerId === x.fighterB.id ? x.fighterB : null;
          return (
            <li key={x.id}>
              <Link href={`/fights/${x.slug}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-white/5">
                <span className="min-w-0 truncate font-semibold">{x.fighterA.lastName} vs {x.fighterB.lastName}</span>
                <span className={`shrink-0 text-xs uppercase tracking-widest ${x.status === "LIVE" ? "font-bold text-live" : "text-fog"}`}>
                  {x.status === "LIVE" ? `Live · R${x.currentRound ?? 1}` : x.status === "COMPLETED" ? (w ? `${w.lastName} · ${methodLabel(x.method)}${x.endRound ? ` R${x.endRound}` : ""}` : methodLabel(x.method) || "Draw") : x.status === "CANCELLED" ? "Cancelled" : "Up next"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
