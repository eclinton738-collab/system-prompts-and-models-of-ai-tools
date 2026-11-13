"use client";

import { useCallback, useEffect, useState } from "react";
import type { LiveSnapshot, LiveFight } from "@/server/services/live";
import { api } from "./api";

const METHODS = ["KO", "TKO", "UD", "SD", "MD", "DRAW", "RTD", "DQ", "NC"];
const STAT_FIELDS = [["jabsThrown", "Jabs thrown"], ["jabsLanded", "Jabs landed"], ["powerThrown", "Power thrown"], ["powerLanded", "Power landed"], ["bodyLanded", "Body landed"], ["headLanded", "Head landed"], ["knockdowns", "Knockdowns"]] as const;

/** Ringside control panel. Every button issues one command to /api/v1/admin/live. */
export function LiveConsole({ eventId, eventName, initial }: { eventId: string; eventName: string; initial: LiveSnapshot }) {
  const [snap, setSnap] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const r = await api<LiveSnapshot>(`/api/v1/live/${eventId}`);
    if (r.data) setSnap(r.data);
  }, [eventId]);
  useEffect(() => {
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh]);

  async function send(body: Record<string, unknown>, okText = "Done.") {
    setBusy(true);
    const r = await api("/api/v1/admin/live", { body });
    setBusy(false);
    setMsg(r.error ? { ok: false, text: r.error.message } : { ok: true, text: okText });
    await refresh();
    return !r.error;
  }

  const live = snap.current;
  return (
    <div className="space-y-6">
      <section className="card flex flex-wrap items-center justify-between gap-3 p-4" aria-label="Event status">
        <div><p className="label">Event</p><p className="display text-2xl">{eventName}</p><p className={`text-sm font-bold uppercase tracking-widest ${snap.status === "LIVE" ? "text-live" : "text-fog"}`}>{snap.status}</p></div>
        <div className="flex flex-wrap gap-2">
          {snap.status !== "LIVE" && <button disabled={busy} className="btn btn-red" onClick={() => window.confirm("Set this event LIVE? The public event page switches to live mode.") && send({ action: "event_status", eventId, status: "LIVE" }, "Event is live.")}>Go live</button>}
          {snap.status === "LIVE" && <button disabled={busy} className="btn btn-gold" onClick={() => window.confirm("Mark the event completed?") && send({ action: "event_status", eventId, status: "COMPLETED" }, "Event completed.")}>End event</button>}
          {snap.status !== "SCHEDULED" && <button disabled={busy} className="btn btn-ghost" onClick={() => window.confirm("Return the event to scheduled?") && send({ action: "event_status", eventId, status: "SCHEDULED" }, "Event set to scheduled.")}>Back to scheduled</button>}
        </div>
      </section>
      <p role="status" aria-live="polite" className={`min-h-5 text-sm font-semibold ${msg?.ok ? "text-win" : "text-red"}`}>{msg?.text}</p>

      {live && <FightControl key={live.id} f={live} send={send} busy={busy} />}

      <section aria-labelledby="bouts">
        <h2 id="bouts" className="mb-3 text-2xl">Bouts</h2>
        <ul className="card divide-y divide-line">
          {snap.fights.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <span><span className="font-semibold">{f.fighterA.lastName} vs {f.fighterB.lastName}</span> · {f.division.name} · {f.rounds} rds</span>
              <span className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-widest ${f.status === "LIVE" ? "text-live" : "text-fog"}`}>{f.status}{f.status === "COMPLETED" && f.method ? ` · ${f.method}` : ""}</span>
                {f.status === "SCHEDULED" && <button disabled={busy || snap.status !== "LIVE"} className="btn btn-ghost btn-sm" onClick={() => send({ action: "fight_start", fightId: f.id }, "Fight started.")}>Start</button>}
                {f.status === "COMPLETED" && <button disabled={busy} className="btn btn-ghost btn-sm" onClick={() => window.confirm("Clear this result and reset the fight?") && send({ action: "reset", fightId: f.id }, "Fight reset.")}>Reset</button>}
              </span>
            </li>
          ))}
        </ul>
        {snap.status !== "LIVE" && <p className="mt-2 text-xs text-fog">Set the event live to start fights.</p>}
      </section>
    </div>
  );
}

function FightControl({ f, send, busy }: { f: LiveFight; send: (b: Record<string, unknown>, ok?: string) => Promise<boolean>; busy: boolean }) {
  const [text, setText] = useState("");
  const [side, setSide] = useState<"A" | "B">("A");
  const [stats, setStats] = useState<Record<string, string>>({});
  const [card, setCard] = useState({ judge: "", scoreA: "", scoreB: "" });
  const [res, setRes] = useState({ winner: "A", method: "KO", endRound: String(f.currentRound ?? 1), endTime: "" });
  const round = f.currentRound ?? 1;
  const decision = ["UD", "SD", "MD"].includes(res.method);
  const none = res.method === "DRAW" || res.method === "NC";
  const num = (v: string) => Number(v || 0);

  return (
    <section className="border border-red/60 bg-coal p-4 sm:p-5" aria-label="Current fight controls">
      <p className="text-xs font-bold uppercase tracking-widest text-live">On now</p>
      <h2 className="text-3xl sm:text-4xl">{f.fighterA.lastName} <span className="text-red">vs</span> {f.fighterB.lastName}</h2>
      <p className="text-sm text-fog">Round {round} of {f.rounds} · clock {f.clockRunning ? "running" : "stopped"}</p>

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <p className="label">Round & clock</p>
            <div className="flex flex-wrap gap-2">
              <button disabled={busy} className={`btn btn-sm ${f.clockRunning ? "btn-white" : "btn-red"}`} onClick={() => send({ action: "clock", fightId: f.id, running: !f.clockRunning }, f.clockRunning ? "Clock stopped." : "Clock running.")}>{f.clockRunning ? "Stop clock" : "Start clock"}</button>
              <button disabled={busy || round <= 1} className="btn btn-ghost btn-sm" onClick={() => send({ action: "round", fightId: f.id, round: round - 1 }, `Round ${round - 1}.`)}>− Round</button>
              <button disabled={busy || round >= f.rounds} className="btn btn-ghost btn-sm" onClick={() => send({ action: "round", fightId: f.id, round: round + 1 }, `Round ${round + 1} ready.`)}>Next round +</button>
            </div>
          </div>
          <form onSubmit={async (e) => { e.preventDefault(); if (await send({ action: "commentary", fightId: f.id, text }, "Commentary posted.")) setText(""); }}>
            <label htmlFor="lc-text" className="label">Live commentary</label>
            <div className="flex gap-2"><input id="lc-text" value={text} onChange={(e) => setText(e.target.value)} maxLength={400} required minLength={2} className="field" placeholder="Big right hand lands…" /><button disabled={busy} className="btn btn-ghost">Post</button></div>
          </form>
          <form onSubmit={async (e) => { e.preventDefault(); if (await send({ action: "scorecard", fightId: f.id, judge: card.judge, scoreA: num(card.scoreA), scoreB: num(card.scoreB) }, "Scorecard saved.")) setCard({ judge: "", scoreA: "", scoreB: "" }); }}>
            <p className="label">Judge’s scorecard</p>
            <div className="grid grid-cols-[1fr_4.5rem_4.5rem_auto] gap-2">
              <input aria-label="Judge name" required value={card.judge} onChange={(e) => setCard({ ...card, judge: e.target.value })} className="field" placeholder="Judge" />
              <input aria-label={`Score for ${f.fighterA.lastName}`} required type="number" min={0} value={card.scoreA} onChange={(e) => setCard({ ...card, scoreA: e.target.value })} className="field" placeholder="A" />
              <input aria-label={`Score for ${f.fighterB.lastName}`} required type="number" min={0} value={card.scoreB} onChange={(e) => setCard({ ...card, scoreB: e.target.value })} className="field" placeholder="B" />
              <button disabled={busy} className="btn btn-ghost">Save</button>
            </div>
            {f.scorecards.length > 0 && <p className="mt-1 text-xs text-fog">{f.scorecards.map((c) => `${c.judge} ${c.scoreA}–${c.scoreB}`).join(" · ")}</p>}
          </form>
        </div>

        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void send({ action: "stats", fightId: f.id, side, round, ...Object.fromEntries(STAT_FIELDS.map(([k]) => [k, num(stats[k])])) }, `Round ${round} stats saved.`); }}>
          <p className="label">Round {round} punch statistics</p>
          <div className="flex gap-2" role="group" aria-label="Fighter">
            {(["A", "B"] as const).map((s) => <button key={s} type="button" aria-pressed={side === s} onClick={() => setSide(s)} className={`btn btn-sm flex-1 ${side === s ? "btn-white" : "btn-ghost"}`}>{s === "A" ? f.fighterA.lastName : f.fighterB.lastName}</button>)}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STAT_FIELDS.map(([k, l]) => <div key={k}><label htmlFor={`st-${k}`} className="text-[0.65rem] uppercase tracking-widest text-fog">{l}</label><input id={`st-${k}`} type="number" min={0} max={999} value={stats[k] ?? ""} onChange={(e) => setStats({ ...stats, [k]: e.target.value })} className="field" /></div>)}
          </div>
          <button disabled={busy} className="btn btn-ghost btn-sm">Save round stats</button>
          <p className="text-xs text-fog">Enter the round totals for the selected fighter. Saving again replaces that round.</p>
        </form>
      </div>

      <form className="mt-5 border-t border-line pt-4" onSubmit={(e) => { e.preventDefault(); if (window.confirm("Record this as the official result? Fan predictions are settled and followers are notified.")) void send({ action: "result", fightId: f.id, winner: none ? "NONE" : res.winner, method: res.method, endRound: decision || none ? null : Number(res.endRound), endTime: decision || none || !res.endTime ? null : res.endTime }, "Official result recorded."); }}>
        <p className="label">Official result</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <select aria-label="Method" value={res.method} onChange={(e) => setRes({ ...res, method: e.target.value })} className="field">{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
          <select aria-label="Winner" disabled={none} value={none ? "NONE" : res.winner} onChange={(e) => setRes({ ...res, winner: e.target.value })} className="field">{none ? <option value="NONE">No winner</option> : <><option value="A">{f.fighterA.lastName}</option><option value="B">{f.fighterB.lastName}</option></>}</select>
          <input aria-label="Round ended" type="number" min={1} max={f.rounds} disabled={decision || none} value={res.endRound} onChange={(e) => setRes({ ...res, endRound: e.target.value })} className="field" placeholder="Round" />
          <input aria-label="Time, minutes colon seconds" disabled={decision || none} pattern="\d:\d\d" value={res.endTime} onChange={(e) => setRes({ ...res, endTime: e.target.value })} className="field" placeholder="m:ss" />
          <button disabled={busy} className="btn btn-gold col-span-2 sm:col-span-1">Record result</button>
        </div>
      </form>
    </section>
  );
}
