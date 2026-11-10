"use client";

/**
 * Client data layer. The browser holds a read-only snapshot fetched from the
 * API and re-fetched when the server's version changes; every mutation goes
 * through `call()` → POST /api/rpc/<action>. To move to a real backend, keep
 * this file and point the two fetches at it.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { buildIndex, type Index } from "@/lib/metrics";
import { can as canDo } from "@/lib/permissions";
import type { ActionInput, ActionName } from "@/lib/schemas";
import type { Permission, Snapshot } from "@/lib/types";

interface Ops {
  s: Snapshot;
  ix: Index;
  can: (...anyOf: Permission[]) => boolean;
  call: <T = unknown>(action: ActionName, input: ActionInput<ActionName>) => Promise<T>;
  refresh: () => Promise<void>;
  switchUser: (userId: string) => Promise<void>;
  /** Server time minus device time, so clocks and countdowns follow the server. */
  clockOffset: number;
  online: boolean;
}

const Ctx = createContext<Ops | null>(null);
const POLL_MS = 4000;

export function OpsProvider({ children, fallback, errorView }: { children: React.ReactNode; fallback: React.ReactNode; errorView: (retry: () => void) => React.ReactNode }) {
  const [s, setS] = useState<Snapshot | null>(null);
  const [failed, setFailed] = useState(false);
  const [online, setOnline] = useState(true);
  const [clockOffset, setClockOffset] = useState(0);
  const ref = useRef<Snapshot | null>(null);

  const load = useCallback(async (force = false) => {
    const cur = ref.current;
    const qs = cur && !force ? `?v=${cur.version}&u=${cur.currentUser.id}` : "";
    try {
      const res = await fetch(`/api/state${qs}`, { cache: "no-store" });
      setOnline(true);
      if (res.status === 204) return;
      if (!res.ok) throw new Error(`State request failed (${res.status})`);
      const next = (await res.json()) as Snapshot;
      ref.current = next;
      setClockOffset(Date.parse(next.now) - Date.now());
      setS(next);
      setFailed(false);
    } catch {
      setOnline(false);
      if (!ref.current) setFailed(true);
    }
  }, []);

  useEffect(() => {
    load(true);
    const id = setInterval(() => { if (document.visibilityState === "visible") load(); }, POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [load]);

  const call = useCallback(async <T,>(action: ActionName, input: ActionInput<ActionName>) => {
    let res: Response;
    try {
      res = await fetch(`/api/rpc/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    } catch {
      setOnline(false);
      throw new Error("Cannot reach the server. Check the connection and try again.");
    }
    const body = (await res.json().catch(() => ({ ok: false, error: "Unexpected server response" }))) as { ok: boolean; data?: T; error?: string };
    // Refresh either way: a rejected action usually means our copy is stale.
    void load(true);
    if (!body.ok) throw new Error(body.error ?? "Request failed");
    return body.data as T;
  }, [load]);

  const switchUser = useCallback(async (userId: string) => {
    await fetch("/api/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId }) });
    await load(true);
  }, [load]);

  const value = useMemo<Ops | null>(() => {
    if (!s) return null;
    return { s, ix: buildIndex(s), can: (...p) => canDo(s.permissions, ...p), call, refresh: () => load(true), switchUser, clockOffset, online };
  }, [s, call, load, switchUser, clockOffset, online]);

  if (failed) return <>{errorView(() => { setFailed(false); load(true); })}</>;
  if (!value) return <>{fallback}</>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOps() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useOps must be used inside <OpsProvider>");
  return v;
}

/** Server-synchronised clock, ticking once a second. */
export function useNow(intervalMs = 1000) {
  const { clockOffset } = useOps();
  const [now, setNow] = useState(() => Date.now() + clockOffset);
  useEffect(() => {
    setNow(Date.now() + clockOffset);
    const id = setInterval(() => setNow(Date.now() + clockOffset), intervalMs);
    return () => clearInterval(id);
  }, [clockOffset, intervalMs]);
  return now;
}
