"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";

type Side = { id: string; name: string };

/** Fan prediction — engagement only, no stakes. */
export function PredictionWidget({
  fightId,
  a,
  b,
  rounds,
  split,
  mine,
  open,
}: {
  fightId: string;
  a: Side;
  b: Side;
  rounds: number;
  split: { aPct: number; bPct: number; total: number };
  mine: { pickFighterId: string; method: string | null; round: number | null } | null;
  open: boolean;
}) {
  const router = useRouter();
  const [pick, setPick] = useState(mine?.pickFighterId ?? "");
  const [method, setMethod] = useState(mine?.method ?? "");
  const [round, setRound] = useState(mine?.round ? String(mine.round) : "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await api("/api/v1/predictions", { body: { fightId, pickFighterId: pick, method: method || null, round: method === "KO/TKO" && round ? Number(round) : null } });
    setBusy(false);
    if (res.error) return setMsg({ ok: false, text: res.error.message });
    setMsg({ ok: true, text: mine ? "Prediction updated." : "Prediction locked in. +15 fan points." });
    router.refresh();
  }

  return (
    <section aria-labelledby={`pred-${fightId}`} className="card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 id={`pred-${fightId}`} className="text-2xl sm:text-3xl">Who wins?</h3>
        <span className="text-xs uppercase tracking-widest text-fog">{split.total} fan {split.total === 1 ? "pick" : "picks"}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[a, b].map((s, i) => {
          const p = i === 0 ? split.aPct : split.bPct;
          const on = pick === s.id;
          return (
            <button key={s.id} type="button" disabled={!open} aria-pressed={on} onClick={() => setPick(s.id)} className={`relative overflow-hidden border px-3 py-3 text-left transition-colors disabled:cursor-default ${on ? "border-gold" : "border-line hover:border-fog"}`}>
              <span aria-hidden className={`absolute inset-y-0 left-0 ${i === 0 ? "bg-red/30" : "bg-white/10"}`} style={{ width: `${split.total ? p : 0}%` }} />
              <span className="relative block truncate text-sm font-semibold">{s.name}</span>
              <span className="display relative block text-3xl">{split.total ? `${p}%` : "—"}</span>
            </button>
          );
        })}
      </div>
      {open ? (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor={`pm-${fightId}`} className="label">Method</label>
            <select id={`pm-${fightId}`} value={method} onChange={(e) => setMethod(e.target.value)} className="field min-w-36">
              <option value="">Any</option>
              <option>KO/TKO</option>
              <option>Decision</option>
            </select>
          </div>
          {method === "KO/TKO" && (
            <div>
              <label htmlFor={`pr-${fightId}`} className="label">Round</label>
              <select id={`pr-${fightId}`} value={round} onChange={(e) => setRound(e.target.value)} className="field min-w-24">
                <option value="">Any</option>
                {Array.from({ length: rounds }, (_, i) => <option key={i}>{i + 1}</option>)}
              </select>
            </div>
          )}
          <button type="button" disabled={!pick || busy} onClick={save} className="btn btn-red">{busy ? "Saving…" : mine ? "Update pick" : "Lock in pick"}</button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-fog">Predictions are closed for this fight.</p>
      )}
      <p role="status" aria-live="polite" className={`mt-2 min-h-5 text-sm ${msg?.ok ? "text-win" : "text-red"}`}>{msg?.text}</p>
      <p className="text-xs text-fog">Free to play. Correct picks earn fan points — there are no stakes and no prizes of monetary value.</p>
    </section>
  );
}

/** Vote bar for rivalry fan votes and community polls. */
export function VoteBar({
  endpoint,
  options,
  mine,
  label,
}: {
  endpoint: string;
  options: { key: string; label: string; count: number }[];
  mine: string | null;
  label: string;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState(mine);
  const [counts, setCounts] = useState(options);
  const [error, setError] = useState<string | null>(null);
  const total = counts.reduce((n, o) => n + o.count, 0);

  async function vote(key: string) {
    if (key === choice) return;
    const prev = { choice, counts };
    setChoice(key);
    setCounts((cs) => cs.map((o) => ({ ...o, count: o.count + (o.key === key ? 1 : 0) - (o.key === choice ? 1 : 0) })));
    const res = await api(endpoint, { body: { choice: key } });
    if (res.error) {
      setChoice(prev.choice);
      setCounts(prev.counts);
      setError(res.error.message);
    } else router.refresh();
  }

  return (
    <div role="group" aria-label={label}>
      <ul className="space-y-2">
        {counts.map((o) => {
          const p = total ? Math.round((o.count / total) * 100) : 0;
          const on = choice === o.key;
          return (
            <li key={o.key}>
              <button type="button" aria-pressed={on} onClick={() => vote(o.key)} className={`relative flex min-h-11 w-full items-center justify-between overflow-hidden border px-3 text-left text-sm ${on ? "border-gold" : "border-line hover:border-fog"}`}>
                <span aria-hidden className={`absolute inset-y-0 left-0 ${on ? "bg-gold/25" : "bg-white/8"}`} style={{ width: `${p}%` }} />
                <span className="relative font-semibold">{o.label} {on && <span className="text-gold">✓</span>}</span>
                <span className="relative tabular-nums text-fog">{p}%</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-fog">{total} {total === 1 ? "vote" : "votes"}{choice ? " · you voted" : " · tap to vote"}</p>
      {error && <p role="alert" className="mt-1 text-xs text-red">{error}</p>}
    </div>
  );
}
