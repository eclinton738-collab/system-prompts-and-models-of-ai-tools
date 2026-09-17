"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, ShieldAlert, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

export type ToastTone = "success" | "error" | "warning" | "info" | "security";

export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  body?: string;
}

const ToastContext = createContext<{ push: (t: Omit<Toast, "id">) => void }>({ push: () => {} });

export const useToast = () => useContext(ToastContext);

const ICON: Record<ToastTone, React.ElementType> = {
  success: CheckCircle2,
  error: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
  security: ShieldAlert,
};

const TONE: Record<ToastTone, string> = {
  success: "border-ok/50 bg-ok/10 text-ok",
  error: "border-danger/50 bg-danger/10 text-danger",
  warning: "border-warn/50 bg-warn/10 text-warn",
  info: "border-info/50 bg-info/10 text-info",
  security: "border-acl-red/60 bg-acl-red/12 text-acl-red-bright",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // The portal must not exist on the first client render either, or hydration
  // sees markup the server never produced.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const push = useCallback((toast: Omit<Toast, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5200);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted
        ? createPortal(
            <div
              className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
              role="status"
              aria-live="polite"
            >
              {toasts.map((toast) => {
                const Icon = ICON[toast.tone];
                return (
                  <div
                    key={toast.id}
                    className={cn(
                      "acl-slide-in pointer-events-auto flex items-start gap-2.5 rounded-[4px] border bg-surface px-3 py-2.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,1)]",
                      TONE[toast.tone],
                    )}
                  >
                    <Icon className="mt-[1px] h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-[11px] font-bold uppercase tracking-[0.08em]">{toast.title}</p>
                      {toast.body ? <p className="mt-0.5 text-[11px] leading-relaxed text-ink-2">{toast.body}</p> : null}
                    </div>
                    <button
                      onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                      className="text-ink-4 transition-colors hover:text-ink"
                      aria-label="Dismiss"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}
