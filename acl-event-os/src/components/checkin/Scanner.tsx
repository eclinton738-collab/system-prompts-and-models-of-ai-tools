"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import {
  QrCode as QrIcon, Keyboard, Camera, CameraOff, Loader2, Maximize2, X, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input, Field, Select } from "@/components/ui/Field";
import { ScanResult } from "./ScanResult";
import { useAcl } from "@/lib/client/provider";
import { apiSend, ApiError } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";
import type { ValidationOutcome } from "@/lib/domain/types";

type Mode = "SCAN" | "MANUAL" | "CAMERA";

/** Stable per-browser device identity, recorded on every scan. */
function useDeviceId() {
  const [deviceId, setDeviceId] = useState("ACL-SCN-WEB");
  useEffect(() => {
    try {
      const existing = localStorage.getItem("acl.device.id");
      if (existing) {
        setDeviceId(existing);
        return;
      }
      const next = `ACL-SCN-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      localStorage.setItem("acl.device.id", next);
      setDeviceId(next);
    } catch {
      /* storage blocked — fall back to the default */
    }
  }, []);
  return deviceId;
}

export function Scanner({ className, compactResult }: { className?: string; compactResult?: boolean }) {
  const { state, user, refresh, allows } = useAcl();
  const toast = useToast();
  const deviceId = useDeviceId();

  const [mode, setMode] = useState<Mode>("SCAN");
  const [gateId, setGateId] = useState<string>("gate-main");
  const [manualId, setManualId] = useState("");
  const [outcome, setOutcome] = useState<ValidationOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLive, setCameraLive] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  // Guards against the camera firing the same code dozens of times a second.
  const lastPayload = useRef<{ value: string; at: number } | null>(null);
  const processing = useRef(false);

  useEffect(() => {
    if (state?.gates?.length && !state.gates.some((g) => g.id === gateId)) {
      setGateId(state.gates[0].id);
    }
  }, [state?.gates, gateId]);

  const submit = useCallback(
    async (payload: string, source: "CAMERA" | "MANUAL") => {
      if (processing.current) return;
      const value = payload.trim();
      if (!value) {
        setFieldError("Enter a ticket ID.");
        return;
      }
      processing.current = true;
      setBusy(true);
      setFieldError(null);
      try {
        const result = await apiSend<ValidationOutcome>("/api/checkin", {
          payload: value,
          gateId,
          operatorId: user.id,
          deviceId,
          source,
        });
        setOutcome(result);
        if (result.result === "GRANTED") {
          navigator.vibrate?.(60);
          toast.push({ tone: "success", title: "Access granted", body: `${result.ticket?.id} — ${result.ticket?.attendeeName}` });
        } else {
          navigator.vibrate?.([70, 60, 70]);
          toast.push({
            tone: result.securityEvent ? "security" : "error",
            title: result.headline,
            body: result.message,
          });
        }
        await refresh();
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "The scan could not be processed.";
        setFieldError(message);
        toast.push({ tone: "error", title: "Scan failed", body: message });
      } finally {
        setBusy(false);
        // Brief cooldown so one presented code is not read twice.
        window.setTimeout(() => {
          processing.current = false;
        }, 900);
      }
    },
    [gateId, user.id, deviceId, refresh, toast],
  );

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCameraLive(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (!videoRef.current || controlsRef.current) return;
    setCameraError(null);
    try {
      const reader = new BrowserMultiFormatReader();
      controlsRef.current = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result) => {
          if (!result) return;
          const text = result.getText();
          const previous = lastPayload.current;
          // Same code within 2.5s is the same person still holding it up.
          if (previous && previous.value === text && Date.now() - previous.at < 2500) return;
          lastPayload.current = { value: text, at: Date.now() };
          void submit(text, "CAMERA");
        },
      );
      setCameraLive(true);
    } catch (err) {
      const name = (err as Error)?.name;
      setCameraError(
        name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser, or use manual entry."
          : name === "NotFoundError"
            ? "No camera was found on this device. Use manual entry instead."
            : "The camera could not be started. Use manual entry instead.",
      );
      setCameraLive(false);
    }
  }, [submit]);

  useEffect(() => {
    if (mode === "SCAN" || mode === "CAMERA") void startCamera();
    else stopCamera();
    return stopCamera;
  }, [mode, startCamera, stopCamera]);

  useEffect(() => stopCamera, [stopCamera]);

  if (!allows("checkin.scan")) {
    return (
      <div className={cn("acl-inset p-5 text-center", className)}>
        <p className="text-[12.5px] text-ink-3">
          Your role cannot operate the gate scanner. Switch to Check-In Staff or an Event Manager account.
        </p>
      </div>
    );
  }

  const gatesOpen = state?.gatesOpen?.open ?? true;

  const viewport = (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[3px] bg-black">
      <video ref={videoRef} className="h-full w-full object-cover" playsInline muted aria-label="Ticket scanner camera" />

      {!cameraLive && !cameraError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#06070A]">
          <Loader2 className="h-5 w-5 animate-spin text-ink-4" />
          <p className="text-[11.5px] text-ink-3">Starting camera…</p>
        </div>
      ) : null}

      {cameraError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#06070A] px-6 text-center">
          <CameraOff className="h-6 w-6 text-warn" />
          <p className="max-w-xs text-[12px] leading-relaxed text-ink-2">{cameraError}</p>
          <Button size="sm" variant="outline" onClick={() => setMode("MANUAL")}>
            Use manual entry
          </Button>
        </div>
      ) : null}

      {/* Reticle */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative h-[58%] aspect-square">
          {(["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "left-0 bottom-0 border-l-2 border-b-2", "right-0 bottom-0 border-r-2 border-b-2"] as const).map(
            (pos) => (
              <span key={pos} className={cn("absolute h-7 w-7 border-acl-red", pos)} />
            ),
          )}
          {cameraLive ? (
            <span className="acl-scan-line absolute inset-x-1 top-0 h-[2px] bg-gradient-to-r from-transparent via-acl-red-bright to-transparent" />
          ) : null}
        </div>
      </div>

      {busy ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/65">
          <div className="flex items-center gap-2 rounded-[3px] border border-hairline-strong bg-surface px-3 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-acl-red-bright" />
            <span className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-ink">Validating…</span>
          </div>
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/85 to-transparent px-3 pb-2.5 pt-6">
        <span className="font-display text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink-2">
          Point camera at ticket QR code
        </span>
        <span className="flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full", cameraLive ? "bg-ok acl-live-dot" : "bg-ink-4")} />
          <span className="font-mono text-[9.5px] text-ink-3">{deviceId}</span>
        </span>
      </div>
    </div>
  );

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-1 gap-1" role="tablist" aria-label="Scanner mode">
          {([
            ["SCAN", "Scan QR", QrIcon],
            ["MANUAL", "Manual Entry", Keyboard],
            ["CAMERA", "Camera Mode", Camera],
          ] as const).map(([value, label, Icon]) => (
            <button
              key={value}
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-[3px] border px-2 py-2 font-display text-[10px] font-bold uppercase tracking-[0.1em] transition-colors",
                mode === value
                  ? "border-acl-red bg-acl-red text-white"
                  : "border-hairline-strong bg-surface-2 text-ink-3 hover:text-ink",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {!gatesOpen ? (
        <p className="rounded-[3px] border border-warn/40 bg-warn/10 px-3 py-2 text-[11.5px] text-warn">
          {state?.gatesOpen?.detail} Scans will be refused until the event is live.
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Gate">
          <Select value={gateId} onChange={(e) => setGateId(e.target.value)}>
            {(state?.gates ?? []).map((gate) => (
              <option key={gate.id} value={gate.id}>
                {gate.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Operator">
          <Input value={user.name} readOnly aria-readonly className="cursor-default text-ink-2" />
        </Field>
      </div>

      {mode === "MANUAL" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit(manualId, "MANUAL");
            setManualId("");
          }}
          className="flex flex-col gap-2"
        >
          <Field label="Ticket ID" error={fieldError ?? undefined} hint="Example: ACL-VIP-000482">
            <Input
              value={manualId}
              onChange={(e) => setManualId(e.target.value.toUpperCase())}
              placeholder="ACL-VIP-000482"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              invalid={Boolean(fieldError)}
              className="font-mono uppercase tracking-wider"
            />
          </Field>
          <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
            Validate ticket
          </Button>
          <QuickFill onPick={(id) => setManualId(id)} />
        </form>
      ) : mode === "SCAN" ? (
        viewport
      ) : null}

      {mode === "CAMERA" ? (
        <FullScreenCamera
          onClose={() => setMode("SCAN")}
          videoSlot={viewport}
          outcome={outcome}
        />
      ) : null}

      {outcome ? <ScanResult outcome={outcome} compact={compactResult} /> : null}
    </div>
  );
}

/** Real ticket references from the current dataset, for exercising the gate. */
function QuickFill({ onPick }: { onPick: (id: string) => void }) {
  const { state } = useAcl();
  const samples: Array<{ id: string; label: string }> = [];
  const unused = state?.recentSales?.find((s) => s.status === "PAID");
  if (unused) samples.push({ id: unused.id, label: "Recent sale" });
  const used = state?.lastScan?.ticketId;
  if (used) samples.push({ id: used, label: "Already admitted" });
  samples.push({ id: "ACL-VIP-009821", label: "Unknown ticket" });

  if (!samples.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-t border-hairline pt-2.5">
      <span className="acl-label !text-[8.5px]">Quick fill</span>
      {samples.map((sample) => (
        <button
          key={sample.id + sample.label}
          type="button"
          onClick={() => onPick(sample.id)}
          className="rounded-[2px] border border-hairline-strong bg-surface-2 px-2 py-1 font-mono text-[10px] text-ink-3 transition-colors hover:border-acl-red/50 hover:text-ink"
          title={sample.id}
        >
          {sample.label}
        </button>
      ))}
    </div>
  );
}

function FullScreenCamera({
  onClose,
  videoSlot,
  outcome,
}: {
  onClose: () => void;
  videoSlot: React.ReactNode;
  outcome: ValidationOutcome | null;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#050507]">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-acl-red" />
          <span className="font-display text-[12px] font-extrabold uppercase tracking-[0.1em] text-ink">
            Full-screen scanner
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Exit full-screen scanner">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <div className="mx-auto w-full max-w-lg">{videoSlot}</div>
        {outcome ? (
          <div className="mx-auto w-full max-w-lg">
            <ScanResult outcome={outcome} />
          </div>
        ) : (
          <p className="mx-auto max-w-sm text-center text-[12px] leading-relaxed text-ink-3">
            Hold the attendee&apos;s QR code inside the frame. Results appear here and are written to the
            check-in log immediately.
          </p>
        )}
      </div>
    </div>
  );
}

export function ScannerLauncher({ onOpen }: { onOpen: () => void }) {
  return (
    <Button variant="primary" size="sm" onClick={onOpen}>
      <Maximize2 className="h-3.5 w-3.5" />
      Open scanner
    </Button>
  );
}
