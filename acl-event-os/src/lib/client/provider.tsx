"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { apiGet, getSession, setSession } from "./api";
import type { DashboardState } from "./types";
import type { Role, User } from "@/lib/domain/types";
import { can, type Permission } from "@/lib/domain/permissions";

interface AclContextValue {
  state: DashboardState | null;
  loading: boolean;
  error: string | null;
  /** Re-pull the snapshot. Called after every mutation. */
  refresh: () => Promise<void>;
  /** Bumped on every refresh so list views know to re-fetch. */
  revision: number;
  user: User;
  role: Role;
  setActor: (user: User) => void;
  allows: (permission: Permission) => boolean;
  now: number;
}

const AclContext = createContext<AclContextValue | null>(null);

export function useAcl() {
  const ctx = useContext(AclContext);
  if (!ctx) throw new Error("useAcl must be used inside <AclProvider>");
  return ctx;
}

const FALLBACK_USER: User = {
  id: "usr-clinton",
  name: "Clinton Edward",
  email: "clinton@africacombatleague.com",
  role: "SUPER_ADMIN",
  initials: "CE",
  active: true,
};

export function AclProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [user, setUser] = useState<User>(FALLBACK_USER);
  const [now, setNow] = useState(() => Date.now());
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const next = await apiGet<DashboardState>("/api/state");
      setState(next);
      setError(null);
      setRevision((r) => r + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach ACL Event OS.");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    // Operational software should never show stale numbers on a live gate.
    const poll = window.setInterval(() => void refresh(), 20_000);
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const setActor = useCallback((next: User) => {
    setUser(next);
    setSession({ userId: next.id, role: next.role });
    void 0;
  }, []);

  useEffect(() => {
    setSession({ userId: user.id, role: user.role });
  }, [user]);

  const value = useMemo<AclContextValue>(
    () => ({
      state,
      loading,
      error,
      refresh,
      revision,
      user,
      role: user.role,
      setActor,
      allows: (permission: Permission) => can(getSession().role, permission),
      now,
    }),
    [state, loading, error, refresh, revision, user, setActor, now],
  );

  return <AclContext.Provider value={value}>{children}</AclContext.Provider>;
}
