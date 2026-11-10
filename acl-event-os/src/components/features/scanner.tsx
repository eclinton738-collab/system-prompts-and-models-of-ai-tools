"use client";

import { Camera, CameraOff, CheckCircle2, Flashlight, Keyboard, Maximize2, RefreshCw, ScanLine, ShieldAlert, SwitchCamera, TriangleAlert, Volume2, VolumeX, X, XCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { naira, REASON_LABEL, timeSec, time } from "@/lib/format";
import type { DemoKitItem, ScanMode, ScanOutcome } from "@/lib/types";
import { useOps } from "../ops-provider";
import { Badge, Button, Modal, Panel, Tabs } from "../ui";

type Mode = "scan" | "manual" | "camera";

/* ───────────────────────── Device identity & feedback ───────────────────────── */
function useStored(key: string, make: () => string) {
  const [v, setV] = useState("");
  useEffect(() => {
    let cur: string | null = null;
    try { cur = localStorage.getItem(key); } catch { /* storage unavailable */ }
    if (!cur) { cur = make(); try { localStorage.setItem(key, cur); } catch { /* ignore */ } }
    setV(cur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback((n: string) => { setV(n); try { localStorage.setItem(key, n); } catch { /* ignore */ } }, [key]);
  return [v, set] as const;
}

function feedback(kind: "ok" | "deny" | "alert", sound: boolean) {
  try { navigator.vibrate?.(kind === "ok" ? 80 : kind === "deny" ? [120, 60, 120] : [200, 80, 200, 80, 200]); } catch { /* unsupported */ }
  if (!sound) return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const tones = kind === "ok" ? [[880, 0, 0.12]] : kind === "deny" ? [[220, 0, 0.3]] : [[320, 0, 0.16], [220, 0.2, 0.16], [320, 0.4, 0.16], [220, 0.6, 0.24]];
    for (const [f, at, len] of tones) {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = kind === "ok" ? "sine" : "square"; o.frequency.value = f; g.gain.value = 0.08;
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + len);
    }
    setTimeout(() => ctx.close(), 1500);
  } catch { /* audio blocked */ }
}

/* ───────────────────────── Verdict ───────────────────────── */
export function Verdict({ outcome, onNext, fullscreen }: { outcome: ScanOutcome; onNext: () => void; fullscreen?: boolean }) {
  const { checkIn: c, ticket: t } = outcome;
  const granted = c.result === "GRANTED";
  const duplicate = c.reason === "DUPLICATE";
  const redirect = c.reason === "WRONG_GATE";
  const tone = granted ? "ok" : redirect ? "warn" : "danger";
  const color = { ok: "text-ok", warn: "text-warn", danger: "text-danger" }[tone];
  const frame = { ok: "border-ok bg-ok/[0.12]", warn: "border-warn bg-warn/[0.12]", danger: "border-danger bg-danger/[0.14]" }[tone];
  const Icon = granted ? CheckCircle2 : duplicate ? ShieldAlert : redirect ? TriangleAlert : XCircle;
  const row = (k: string, v: React.ReactNode) => <div className="flex items-baseline justify-between gap-4 border-b border-white/10 py-2 last:border-0"><dt className="shrink-0 font-display text-xs font-semibold uppercase tracking-[0.16em] text-fg-muted">{k}</dt><dd className="min-w-0 truncate text-right text-base font-medium">{v}</dd></div>;

  return (
    <div role="alert" aria-live="assertive" data-verdict={c.result} data-reason={c.reason} className={cn("flex animate-verdict flex-col border-2 p-5", frame, fullscreen && "h-full justify-center border-0 p-6")}>
      <div className={cn("flex items-center gap-3", color)}>
        <Icon className="h-12 w-12 shrink-0" strokeWidth={2.2} />
        <div className="min-w-0">
          {duplicate && <div className="font-display text-sm font-bold uppercase tracking-[0.3em]">Security alert</div>}
          <div className="h-display text-[34px] sm:text-[44px]">{granted ? "Valid ticket" : duplicate ? "Duplicate scan attempt" : redirect ? "Wrong gate" : "Access denied"}</div>
        </div>
      </div>

      {!granted && <p className={cn("mt-3 text-lg font-semibold", color)}>{duplicate ? "This ticket has already been used. Do not admit." : REASON_LABEL[c.reason]}</p>}
      {!granted && !duplicate && <p className="mt-1 text-sm text-fg">{c.message}</p>}

      <dl className="mt-4">
        {row(duplicate ? "Ticket" : "Ticket ID", <span className="font-mono text-lg">{t?.id ?? (c.ticketId || c.presented.slice(0, 30))}</span>)}
        {duplicate && row("Status", <span className="font-display font-bold uppercase tracking-[0.14em] text-danger">Rejected</span>)}
        {duplicate && outcome.firstScan && <>
          {row("First scanned", <span className="tabular-nums">{timeSec(outcome.firstScan.at)}</span>)}
          {row("Gate", outcome.firstScan.gateName)}
          {row("Operator", outcome.firstScan.operatorName)}
          {row("Device", <span className="font-mono text-sm">{outcome.firstScan.deviceId}</span>)}
        </>}
        {t && !duplicate && <>
          {row("Customer", t.attendeeName)}
          {row("Ticket type", `${t.typeName} — ${naira(t.pricePaid)}`)}
          {row("Payment", <span className={cn("font-display font-bold uppercase tracking-[0.14em]", t.paymentStatus === "PAID" ? "text-ok" : "text-danger")}>{t.paymentStatus}</span>)}
          {(t.tableLabel ?? t.seatLabel) && granted && row(t.tableLabel ? "Table" : "Seat", t.tableLabel ?? t.seatLabel)}
        </>}
        {t && duplicate && row("Holder", t.attendeeName)}
        {!duplicate && row(granted ? "Scanned" : "Attempt", <span className="tabular-nums">{time(c.at)}</span>)}
        {!duplicate && row("Gate", outcome.gateName)}
        {redirect && outcome.redirectTo && row("Send guest to", <span className="text-warn">{outcome.redirectTo}</span>)}
      </dl>

      <div className={cn("mt-4 flex items-center justify-center gap-2 py-3 font-display text-2xl font-bold uppercase tracking-[0.2em]", granted ? "bg-ok text-ink-950" : redirect ? "bg-warn text-ink-950" : "bg-danger text-white")}>
        {granted ? "Access granted" : redirect ? "Not admitted here" : "Access denied"}
      </div>
      <Button size="lg" variant="secondary" className="mt-3 w-full" autoFocus={!granted} onClick={onNext}><ScanLine className="h-5 w-5" />{granted ? "Next guest" : "Acknowledge & scan next"}</Button>
      <p className="mt-2 text-center text-[11px] text-fg-dim">Logged · {c.id} · {outcome.operatorName} · {c.deviceId} · {c.mode === "QR" ? "QR scan" : "manual entry"}</p>
    </div>
  );
}

/* ───────────────────────── Camera ───────────────────────── */
type CamState = "starting" | "live" | "denied" | "unavailable";

function CameraView({ onDecode, paused, fullscreen }: { onDecode: (text: string) => void; paused: boolean; fullscreen?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const scanner = useRef<import("qr-scanner").default | null>(null);
  const decode = useRef(onDecode); decode.current = onDecode;
  const pausedRef = useRef(paused); pausedRef.current = paused;
  const [state, setState] = useState<CamState>("starting");
  const [flash, setFlash] = useState<{ has: boolean; on: boolean }>({ has: false, on: false });
  const [cams, setCams] = useState<{ id: string; label: string }[]>([]);
  const [camIdx, setCamIdx] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let dead = false;
    setState("starting");
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setState("unavailable"); return; }
      const { default: QrScanner } = await import("qr-scanner");
      if (dead || !video.current) return;
      const qr = new QrScanner(video.current, (r) => { if (!pausedRef.current) decode.current(r.data); }, { preferredCamera: "environment", maxScansPerSecond: 12, returnDetailedScanResult: true, highlightScanRegion: false, onDecodeError: () => {} });
      scanner.current = qr;
      try {
        await qr.start();
        if (dead) { qr.destroy(); return; }
        setState("live");
        setFlash({ has: await qr.hasFlash().catch(() => false), on: false });
        setCams(await QrScanner.listCameras(true).catch(() => []));
      } catch (err) {
        if (dead) return;
        const msg = String(err);
        setState(/denied|NotAllowed|Permission/i.test(msg) ? "denied" : "unavailable");
      }
    })();
    return () => { dead = true; scanner.current?.destroy(); scanner.current = null; };
  }, [attempt]);

  const switchCam = async () => {
    if (cams.length < 2 || !scanner.current) return;
    const next = (camIdx + 1) % cams.length;
    await scanner.current.setCamera(cams[next].id).catch(() => toast.error("Could not switch camera"));
    setCamIdx(next);
  };
  const toggleFlash = async () => { await scanner.current?.toggleFlash().catch(() => {}); setFlash((f) => ({ ...f, on: scanner.current?.isFlashOn() ?? false })); };

  return (
    <div className={cn("relative overflow-hidden bg-black", fullscreen ? "h-full w-full" : "aspect-[4/3] w-full border border-ink-500 sm:aspect-video")}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={video} className="h-full w-full object-cover" playsInline muted aria-label="Camera viewfinder" />
      {state === "live" && (
        <>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative aspect-square w-[min(62%,340px)]">
              {["left-0 top-0 border-l-4 border-t-4", "right-0 top-0 border-r-4 border-t-4", "left-0 bottom-0 border-l-4 border-b-4", "right-0 bottom-0 border-r-4 border-b-4"].map((c) => <span key={c} className={cn("absolute h-9 w-9", paused ? "border-fg-dim" : "border-acl-glow", c)} />)}
              {!paused && <span className="absolute inset-x-2 h-0.5 animate-scanline bg-acl-glow shadow-[0_0_14px_2px_rgba(255,59,74,0.9)]" />}
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent p-3">
            <span className="flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.18em] text-white"><span className={cn("h-2 w-2 rounded-full", paused ? "bg-warn" : "animate-pulse-dot bg-ok")} />{paused ? "Paused" : "Point at the guest’s QR code"}</span>
            <span className="flex gap-1.5">
              {flash.has && <Button size="icon" aria-label="Toggle torch" aria-pressed={flash.on} className={cn(flash.on && "border-warn text-warn")} onClick={toggleFlash}><Flashlight className="h-4 w-4" /></Button>}
              {cams.length > 1 && <Button size="icon" aria-label="Switch camera" onClick={switchCam}><SwitchCamera className="h-4 w-4" /></Button>}
            </span>
          </div>
        </>
      )}
      {state !== "live" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-900 p-6 text-center">
          {state === "starting" ? <><Camera className="h-9 w-9 animate-pulse text-fg-dim" /><p className="eyebrow">Starting camera…</p></> : (
            <>
              <CameraOff className="h-9 w-9 text-warn" />
              <p className="h-display text-xl">{state === "denied" ? "Camera permission blocked" : "No camera available"}</p>
              <p className="max-w-sm text-sm text-fg-muted">{state === "denied" ? "Allow camera access for this site in your browser settings, then retry." : "This device has no usable camera, or the page is not on HTTPS. Use Manual Entry to keep the gate moving."}</p>
              <Button onClick={() => setAttempt((a) => a + 1)}><RefreshCw className="h-4 w-4" />Retry camera</Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Scanner ───────────────────────── */
export function Scanner() {
  const { s, call } = useOps();
  const [mode, setMode] = useState<Mode>("scan");
  const [deviceId] = useStored("acl_device_id", () => `SCN-${Math.random().toString(36).slice(2, 6).toUpperCase()}`);
  const openGates = s.gates.filter((g) => g.active);
  const [storedGate, setGate] = useStored("acl_gate", () => openGates[0]?.id ?? "");
  const gateId = openGates.some((g) => g.id === storedGate) ? storedGate : openGates[0]?.id ?? "";
  const [sound, setSound] = useState(true);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [manual, setManual] = useState("");
  const [manualError, setManualError] = useState("");
  const [kit, setKit] = useState<DemoKitItem | null>(null);
  const lock = useRef(false);
  const lastGranted = useRef<{ payload: string; at: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualInput = useRef<HTMLInputElement>(null);
  /** When the scanner last became ready for a guest — scan speed is measured from here to capture. */
  const readyAt = useRef(0);
  useEffect(() => { readyAt.current = performance.now(); }, []);

  const next = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setOutcome(null); lock.current = false; readyAt.current = performance.now();
    if (mode === "manual") setTimeout(() => manualInput.current?.focus(), 30);
  }, [mode]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const submit = useCallback(async (payload: string, scanMode: ScanMode, timed = true) => {
    if (lock.current || !gateId || !deviceId) return;
    // A guest's phone is usually still in frame after ACCESS GRANTED; don't re-submit it and raise a false duplicate alarm.
    if (scanMode === "QR" && lastGranted.current?.payload === payload && Date.now() - lastGranted.current.at < 6000) return;
    lock.current = true; setBusy(true);
    const durationMs = timed && scanMode === "QR" ? Math.min(120_000, Math.round(performance.now() - readyAt.current)) : undefined;
    try {
      const res = await call<ScanOutcome>("checkin.scan", { payload, gateId, deviceId, mode: scanMode, durationMs });
      setOutcome(res);
      const granted = res.checkIn.result === "GRANTED";
      feedback(granted ? "ok" : res.checkIn.reason === "DUPLICATE" ? "alert" : "deny", sound);
      if (granted) {
        lastGranted.current = { payload, at: Date.now() };
        setManual("");
        // Granted clears itself so the line keeps moving. Rejections wait for the operator.
        timer.current = setTimeout(next, 3500);
      }
    } catch (err) {
      toast.error((err as Error).message);
      lock.current = false;
    } finally { setBusy(false); }
  }, [call, gateId, deviceId, sound, next]);

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const id = manual.trim().toUpperCase();
    if (!/^ACL-[A-Z]{2,4}(-[A-Z]{2})?-\d{3,6}$/.test(id)) { setManualError("Enter the full ticket ID, e.g. ACL-VIP-000482"); return; }
    setManualError("");
    submit(id, "MANUAL");
  };

  if (openGates.length === 0) return <Panel title="Live Check-In Scanner"><p className="text-sm text-warn">All gates are closed. Open a gate in Event Settings to start scanning.</p></Panel>;
  const gate = s.gates.find((g) => g.id === gateId);
  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 text-xs text-fg-muted"><span className="eyebrow">Gate</span>
        <select aria-label="Gate" className="input h-9 w-auto min-w-[150px]" value={gateId} onChange={(e) => setGate(e.target.value)}>{openGates.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
      </label>
      <Badge className="h-9 px-2.5 font-mono normal-case tracking-normal">{deviceId || "…"}</Badge>
      <Button size="icon" aria-label={sound ? "Mute scan sounds" : "Unmute scan sounds"} aria-pressed={sound} onClick={() => setSound(!sound)}>{sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <Panel title="Live Check-In Scanner" eyebrow={`Operator · ${s.currentUser.name}`} action={controls}>
        <Tabs label="Scanner mode" className="mb-4 w-full sm:w-auto" value={mode} onChange={(m) => { setMode(m); next(); }} options={[{ value: "scan", label: "Scan QR" }, { value: "manual", label: "Manual Entry" }, { value: "camera", label: "Camera Mode" }]} />
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            {mode === "scan" && <CameraView onDecode={(t) => submit(t, "QR")} paused={busy || !!outcome} />}
            {mode === "camera" && (
              <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 border border-ink-500 bg-ink-900 p-6 text-center sm:aspect-video">
                <Maximize2 className="h-8 w-8 text-fg-dim" /><p className="text-sm text-fg-muted">Full-screen camera is open.</p>
              </div>
            )}
            {mode === "manual" && (
              <form onSubmit={submitManual} noValidate className="flex aspect-[4/3] flex-col justify-center border border-ink-500 bg-ink-900 p-5 sm:aspect-video sm:p-8">
                <Keyboard className="h-8 w-8 text-fg-dim" />
                <label htmlFor="manual-id" className="h-display mt-3 text-2xl">Enter ticket ID</label>
                <p className="mt-1 text-sm text-fg-muted">Use when a code will not scan. Check the guest’s ID against the name shown before admitting.</p>
                <input id="manual-id" ref={manualInput} autoFocus autoComplete="off" autoCapitalize="characters" spellCheck={false} aria-invalid={!!manualError} aria-describedby="manual-err"
                  className="input mt-4 h-14 font-mono text-xl uppercase tracking-wide" placeholder="ACL-VIP-000482" value={manual} onChange={(e) => { setManual(e.target.value); setManualError(""); }} />
                <p id="manual-err" className="mt-1 min-h-5 text-sm text-danger">{manualError}</p>
                <Button type="submit" variant="primary" size="lg" loading={busy} disabled={!!outcome} className="mt-2">Validate ticket</Button>
              </form>
            )}
          </div>
          <div className="min-h-[280px]">
            {outcome && mode !== "camera" ? <Verdict outcome={outcome} onNext={next} /> : (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 border border-dashed border-ink-500 p-6 text-center">
                <ScanLine className={cn("h-10 w-10", busy ? "animate-pulse text-acl-glow" : "text-fg-dim")} />
                <p className="h-display text-2xl">{busy ? "Validating…" : "Ready to scan"}</p>
                <p className="max-w-xs text-sm text-fg-muted">{gate?.name} · admits {gate?.allowedTypes.map((t) => s.ticketTypes.find((x) => x.id === t)?.shortName).join(", ")}</p>
                <p className="max-w-xs text-xs text-fg-dim">Every result is decided by the server from the ticket record. Each ticket admits once.</p>
              </div>
            )}
          </div>
        </div>
      </Panel>

      {s.demo && s.demoKit.length > 0 && (
        <Panel title="Gate Rehearsal Kit" eyebrow="Demo mode" action={<Badge tone="info">Simulated scans go through the real validation API</Badge>}>
          <p className="mb-3 text-sm text-fg-muted">No second phone handy? Fire a scan for each scenario, or open a code and point this device’s camera at it on another screen.</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {s.demoKit.map((k) => (
              <div key={k.label} className="flex items-center justify-between gap-3 border border-ink-600 bg-ink-900 p-3">
                <div className="min-w-0"><div className="truncate text-sm font-semibold">{k.label}</div><div className="ticket-id truncate text-fg-muted">{k.ticketId}</div><div className="text-[11px] text-fg-dim">Expect: {k.expect}</div></div>
                <div className="flex shrink-0 gap-1.5"><Button size="sm" onClick={() => setKit(k)}>QR</Button><Button size="sm" variant="primary" disabled={busy || !!outcome} onClick={() => { if (mode === "camera") setMode("scan"); submit(k.payload, "QR", false); }}>Scan</Button></div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Modal open={!!kit} onClose={() => setKit(null)} title={kit?.label ?? ""} description={kit ? `${kit.ticketId} · expect ${kit.expect}` : undefined} size="sm">
        {kit && <div className="flex justify-center bg-white p-5"><QRCodeSVG value={kit.payload} size={260} level="M" /></div>}
      </Modal>

      {/* Camera mode: the whole screen is the scanner. Built for a phone at the gate. */}
      {mode === "camera" && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-black" role="dialog" aria-label="Full-screen scanner">
          <div className="flex items-center justify-between gap-3 bg-ink-950 px-4 py-2.5 pt-[max(10px,env(safe-area-inset-top))]">
            <div className="min-w-0"><div className="h-display truncate text-lg">{gate?.name}</div><div className="truncate text-xs text-fg-dim">{s.currentUser.name} · {deviceId}</div></div>
            <div className="flex items-center gap-1.5">
              <Button size="icon" aria-label={sound ? "Mute" : "Unmute"} onClick={() => setSound(!sound)}>{sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</Button>
              <Button size="icon" aria-label="Exit camera mode" onClick={() => { setMode("scan"); next(); }}><X className="h-5 w-5" /></Button>
            </div>
          </div>
          <div className="relative min-h-0 flex-1">
            <CameraView fullscreen onDecode={(t) => submit(t, "QR")} paused={busy || !!outcome} />
            {busy && <div className="absolute inset-0 flex items-center justify-center bg-black/60"><span className="h-display animate-pulse text-3xl">Validating…</span></div>}
            {outcome && <div className={cn("absolute inset-0 overflow-y-auto", outcome.checkIn.result === "GRANTED" ? "bg-[#06140c]" : outcome.checkIn.reason === "WRONG_GATE" ? "bg-[#171003]" : "bg-[#1a0606]")}><Verdict outcome={outcome} onNext={next} fullscreen /></div>}
          </div>
        </div>
      )}
    </div>
  );
}
