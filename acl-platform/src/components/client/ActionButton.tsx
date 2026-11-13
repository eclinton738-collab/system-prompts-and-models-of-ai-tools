"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";

/** One-shot API button (sign out, mark read, admin actions…). */
export function ActionButton({
  endpoint,
  method = "POST",
  body,
  label,
  busyLabel = "Working…",
  className = "btn btn-ghost btn-sm",
  confirm,
  redirectTo,
}: {
  endpoint: string;
  method?: string;
  body?: unknown;
  label: string;
  busyLabel?: string;
  className?: string;
  confirm?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={busy}
        className={className}
        onClick={async () => {
          if (confirm && !window.confirm(confirm)) return;
          setBusy(true);
          setError(null);
          const res = await api(endpoint, { method, body: body ?? {} });
          setBusy(false);
          if (res.error) return setError(res.error.message);
          if (redirectTo) router.push(redirectTo);
          router.refresh();
        }}
      >
        {busy ? busyLabel : label}
      </button>
      {error && <span role="alert" className="text-xs text-red">{error}</span>}
    </span>
  );
}

/** Toggle button with optimistic state (follow, notify, watchlist, favourite). */
export function ToggleButton({
  endpoint,
  body,
  initial,
  onLabel,
  offLabel,
  className = "btn btn-sm",
  onClass = "btn-white",
  offClass = "btn-red",
}: {
  endpoint: string;
  body?: Record<string, unknown>;
  initial: boolean;
  onLabel: string;
  offLabel: string;
  className?: string;
  onClass?: string;
  offClass?: string;
}) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={busy}
      className={`${className} ${on ? onClass : offClass}`}
      onClick={async () => {
        setBusy(true);
        const next = !on;
        setOn(next);
        const res = await api(endpoint, { method: "POST", body: { ...body, on: next } });
        setBusy(false);
        if (res.error) setOn(!next);
        else router.refresh();
      }}
    >
      {on ? onLabel : offLabel}
    </button>
  );
}
