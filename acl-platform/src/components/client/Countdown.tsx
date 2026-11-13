"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** Event countdown. Renders server-computed values first to avoid layout shift, then ticks on the client. */
export function Countdown({ to, initialMs, size = "lg" }: { to: string; initialMs: number; size?: "lg" | "sm" }) {
  const [ms, setMs] = useState(initialMs);
  useEffect(() => {
    const target = new Date(to).getTime();
    const tick = () => setMs(target - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [to]);
  if (ms <= 0) return <p className="display text-2xl text-gold">Fight night is here</p>;
  const p = parts(ms);
  const cells: [number, string][] = [[p.d, "Days"], [p.h, "Hours"], [p.m, "Mins"], [p.s, "Secs"]];
  return (
    <div role="timer" aria-label={`${p.d} days ${p.h} hours ${p.m} minutes until the event`} className="flex gap-2 sm:gap-3">
      {cells.map(([n, l]) => (
        <div key={l} className={`flex flex-col items-center border border-white/15 bg-black/50 backdrop-blur ${size === "lg" ? "w-16 py-2 sm:w-20 sm:py-3" : "w-12 py-1.5"}`}>
          <span className={`display tabular-nums leading-none ${size === "lg" ? "text-3xl sm:text-5xl" : "text-2xl"}`} suppressHydrationWarning>{String(n).padStart(2, "0")}</span>
          <span className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-fog">{l}</span>
        </div>
      ))}
    </div>
  );
}
