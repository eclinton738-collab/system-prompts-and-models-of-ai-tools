"use client";

/** ACL design-system primitives. Sharp, dense, operational. */
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, Search, X } from "lucide-react";
import { createContext, forwardRef, useCallback, useContext, useId, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { REASON_LABEL } from "@/lib/format";
import type { PaymentStatus, ScanReason, ScanResult, Severity, TicketStatus } from "@/lib/types";

/* ───────────────────────── Button ───────────────────────── */
type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold" | "success";
type Size = "sm" | "md" | "lg" | "icon";
const VARIANT: Record<Variant, string> = {
  primary: "bg-acl text-white hover:bg-acl-600 active:bg-acl-700 shadow-[0_0_24px_-8px_rgba(225,29,46,0.9)]",
  secondary: "border border-ink-500 bg-ink-800 text-fg hover:border-fg-dim hover:bg-ink-700",
  ghost: "text-fg-muted hover:bg-white/5 hover:text-fg",
  danger: "border border-danger/60 bg-danger/10 text-danger hover:bg-danger/20",
  gold: "bg-gradient-to-b from-gold-light to-gold text-ink-950 hover:brightness-110",
  success: "bg-ok text-ink-950 hover:brightness-110",
};
const SIZE: Record<Size, string> = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base", icon: "h-9 w-9" };

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; size?: Size; loading?: boolean }
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = "secondary", size = "md", loading, className, children, disabled, ...rest }, ref) {
  return (
    <button ref={ref} type="button" disabled={disabled || loading}
      className={cn("inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded font-display font-semibold uppercase tracking-[0.1em] transition disabled:cursor-not-allowed disabled:opacity-45", VARIANT[variant], SIZE[size], className)} {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
});

/* ───────────────────────── Panel ───────────────────────── */
export function Panel({ title, eyebrow, action, children, className, bodyClassName, tone }: { title?: React.ReactNode; eyebrow?: string; action?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string; tone?: "gold" | "alert" }) {
  return (
    <section className={cn("panel flex min-w-0 flex-col", tone === "gold" && "panel-gold", tone === "alert" && "border-danger/50", className)}>
      {(title || action) && (
        <header className="flex min-h-[48px] flex-wrap items-center justify-between gap-2 border-b border-ink-600 px-4 py-2">
          <div className="min-w-0">
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h2 className="h-display truncate text-[15px] tracking-[0.14em] text-fg">{title}</h2>
          </div>
          {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={cn("min-w-0 flex-1 p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="eyebrow flex items-center gap-2"><span className="inline-block h-px w-6 bg-acl" />ACL Event OS</div>
        <h1 className="h-display mt-1 text-3xl text-fg sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-fg-muted">{subtitle}</p>}
      </div>
      {children && <div className="no-print flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/* ───────────────────────── Badges ───────────────────────── */
type Tone = "ok" | "warn" | "danger" | "info" | "gold" | "neutral" | "acl";
const TONE: Record<Tone, string> = {
  ok: "border-ok/40 bg-ok/10 text-ok",
  warn: "border-warn/40 bg-warn/10 text-warn",
  danger: "border-danger/50 bg-danger/10 text-danger",
  info: "border-info/40 bg-info/10 text-info",
  gold: "border-gold/50 bg-gold/10 text-gold-light",
  neutral: "border-ink-500 bg-white/5 text-fg-muted",
  acl: "border-acl bg-acl text-white",
};
export function Badge({ tone = "neutral", children, className, dot }: { tone?: Tone; children: React.ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded border px-1.5 py-0.5 font-display text-[11px] font-semibold uppercase leading-4 tracking-[0.12em]", TONE[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
const PAY_TONE: Record<PaymentStatus, Tone> = { PAID: "ok", PENDING: "warn", FAILED: "danger", REFUNDED: "info" };
export const PaymentBadge = ({ status }: { status: PaymentStatus }) => <Badge tone={PAY_TONE[status]} dot>{status}</Badge>;
const TICKET_TONE: Record<TicketStatus, Tone> = { ACTIVE: "neutral", USED: "ok", REFUNDED: "info", VOID: "danger", SUSPENDED: "danger" };
const TICKET_LABEL: Record<TicketStatus, string> = { ACTIVE: "Not used", USED: "Used", REFUNDED: "Refunded", VOID: "Void", SUSPENDED: "Suspended" };
export const TicketBadge = ({ status }: { status: TicketStatus }) => <Badge tone={TICKET_TONE[status]}>{TICKET_LABEL[status]}</Badge>;
export const ScanBadge = ({ result, reason }: { result: ScanResult; reason?: ScanReason }) =>
  result === "GRANTED" ? <Badge tone="ok" dot>Granted</Badge> : <Badge tone={reason === "WRONG_GATE" ? "warn" : "danger"} dot>Rejected</Badge>;
export const reasonText = (r: ScanReason) => REASON_LABEL[r];
export const severityTone = (s: Severity): Tone => (s === "CRITICAL" ? "danger" : s === "WARNING" ? "warn" : "info");

/* ───────────────────────── Form ───────────────────────── */
export function Field({ label, error, hint, children, className }: { label: string; error?: string; hint?: string; children: (p: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => React.ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="mb-1.5 block font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-muted">{label}</label>
      {children({ id, "aria-invalid": !!error, "aria-describedby": error || hint ? `${id}-d` : undefined })}
      {(error || hint) && <p id={`${id}-d`} className={cn("mt-1 text-xs", error ? "text-danger" : "text-fg-dim")}>{error ?? hint}</p>}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, className, label }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string; label?: string }) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-dim" aria-hidden />
      <input type="search" aria-label={label ?? placeholder} className="input pl-9" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, options, label, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[]; label: string; className?: string }) {
  return (
    <div role="tablist" aria-label={label} className={cn("inline-flex max-w-full overflow-x-auto border border-ink-600 bg-ink-900 p-0.5", className)}>
      {options.map((o) => (
        <button key={o.value} role="tab" type="button" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cn("flex items-center gap-1.5 whitespace-nowrap rounded px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.12em] transition", value === o.value ? "bg-acl text-white" : "text-fg-muted hover:bg-white/5 hover:text-fg")}>
          {o.label}
          {o.count !== undefined && <span className={cn("tabular-nums", value === o.value ? "text-white/80" : "text-fg-dim")}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  return (
    <label className={cn("flex items-start justify-between gap-4 py-2", disabled && "opacity-60")}>
      <span className="min-w-0"><span className="block text-sm font-medium text-fg">{label}</span>{description && <span className="block text-xs text-fg-dim">{description}</span>}</span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition", checked ? "border-ok bg-ok/30" : "border-ink-500 bg-ink-700")}>
        <span className={cn("absolute top-0.5 h-[18px] w-[18px] rounded-full transition-all", checked ? "left-[22px] bg-ok" : "left-0.5 bg-fg-dim")} />
      </button>
    </label>
  );
}

/* ───────────────────────── Overlays ───────────────────────── */
export function Modal({ open, onClose, title, description, children, size = "md", tone }: { open: boolean; onClose: () => void; title: string; description?: string; children: React.ReactNode; size?: "sm" | "md" | "lg" | "xl"; tone?: "gold" }) {
  const w = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" }[size];
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 animate-fade-in bg-black/75 backdrop-blur-sm" />
        <Dialog.Content aria-describedby={undefined} className={cn("panel fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 animate-rise flex-col focus:outline-none", w, tone === "gold" && "panel-gold")}>
          <header className="flex items-start justify-between gap-4 border-b border-ink-600 px-5 py-3.5">
            <div className="min-w-0">
              <Dialog.Title className="h-display text-xl tracking-[0.1em]">{title}</Dialog.Title>
              {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
            </div>
            <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close"><X className="h-4 w-4" /></Button></Dialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Drawer({ open, onClose, title, eyebrow, children, footer }: { open: boolean; onClose: () => void; title: React.ReactNode; eyebrow?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 animate-fade-in bg-black/70 backdrop-blur-sm" />
        <Dialog.Content aria-describedby={undefined} className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[520px] animate-slide-in flex-col border-l border-ink-500 bg-ink-850 shadow-2xl focus:outline-none">
          <header className="flex items-start justify-between gap-4 border-b border-ink-600 px-5 py-4">
            <div className="min-w-0">
              {eyebrow && <div className="eyebrow">{eyebrow}</div>}
              <Dialog.Title className="h-display truncate text-2xl tracking-[0.06em]">{title}</Dialog.Title>
            </div>
            <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close"><X className="h-4 w-4" /></Button></Dialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
          {footer && <footer className="flex flex-wrap gap-2 border-t border-ink-600 bg-ink-900 p-4">{footer}</footer>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* Confirmation — required for refunds, cancellations and settings changes. */
interface ConfirmOptions { title: string; body: React.ReactNode; confirmLabel: string; danger?: boolean; reason?: { label: string; placeholder?: string } }
type ConfirmFn = (o: ConfirmOptions) => Promise<{ ok: boolean; reason: string }>;
const ConfirmCtx = createContext<ConfirmFn>(async () => ({ ok: false, reason: "" }));
export const useConfirm = () => useContext(ConfirmCtx);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: { ok: boolean; reason: string }) => void }) | null>(null);
  const [reason, setReason] = useState("");
  const confirm = useCallback<ConfirmFn>((o) => new Promise((resolve) => { setReason(""); setState({ ...o, resolve }); }), []);
  const done = (ok: boolean) => { state?.resolve({ ok, reason: reason.trim() }); setState(null); };
  const needsReason = !!state?.reason && reason.trim().length < 3;
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal open={!!state} onClose={() => done(false)} title={state?.title ?? ""} size="sm">
        {state && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <AlertTriangle className={cn("mt-0.5 h-5 w-5 shrink-0", state.danger ? "text-danger" : "text-warn")} aria-hidden />
              <div className="text-sm leading-relaxed text-fg-muted">{state.body}</div>
            </div>
            {state.reason && (
              <Field label={state.reason.label}>
                {(p) => <input {...p} className="input" autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder={state.reason?.placeholder} />}
              </Field>
            )}
            <div className="flex justify-end gap-2">
              <Button onClick={() => done(false)}>Cancel</Button>
              <Button variant={state.danger ? "danger" : "primary"} disabled={needsReason} onClick={() => done(true)}>{state.confirmLabel}</Button>
            </div>
          </div>
        )}
      </Modal>
    </ConfirmCtx.Provider>
  );
}

/* ───────────────────────── States ───────────────────────── */
export function EmptyState({ icon: Icon, title, body, action }: { icon: React.ComponentType<{ className?: string }>; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center border border-ink-500 bg-ink-800"><Icon className="h-5 w-5 text-fg-dim" /></div>
      <p className="h-display text-base tracking-[0.12em] text-fg">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-fg-dim">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export const Skeleton = ({ className }: { className?: string }) => <div className={cn("animate-pulse bg-white/[0.06]", className)} />;

export function Progress({ value, tone = "acl", label, className }: { value: number; tone?: "acl" | "ok" | "gold" | "info"; label: string; className?: string }) {
  const pctValue = Math.max(0, Math.min(100, value * 100));
  const bg = { acl: "bg-acl", ok: "bg-ok", gold: "bg-gold", info: "bg-info" }[tone];
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={Math.round(pctValue)} aria-valuemin={0} aria-valuemax={100} className={cn("h-1.5 w-full overflow-hidden bg-white/[0.07]", className)}>
      <div className={cn("h-full transition-[width] duration-500", bg)} style={{ width: `${pctValue}%` }} />
    </div>
  );
}

export function KeyValue({ rows, className }: { rows: [string, React.ReactNode][]; className?: string }) {
  return (
    <dl className={cn("divide-y divide-ink-700 text-sm", className)}>
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between gap-4 py-2">
          <dt className="shrink-0 text-fg-dim">{k}</dt>
          <dd className="min-w-0 truncate text-right text-fg">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ───────────────────────── Pagination ───────────────────────── */
export function usePaged<T>(rows: T[], pageSize = 12) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safe = Math.min(page, pages - 1);
  const slice = useMemo(() => rows.slice(safe * pageSize, safe * pageSize + pageSize), [rows, safe, pageSize]);
  return { slice, page: safe, pages, setPage, total: rows.length, from: rows.length ? safe * pageSize + 1 : 0, to: Math.min(rows.length, (safe + 1) * pageSize) };
}

export function Pager({ p, noun = "rows" }: { p: ReturnType<typeof usePaged<unknown>>; noun?: string }) {
  return (
    <div className="no-print flex items-center justify-between gap-3 border-t border-ink-600 px-3 py-2 text-xs text-fg-dim">
      <span className="tabular-nums">{p.total === 0 ? `No ${noun}` : `${p.from}–${p.to} of ${p.total.toLocaleString()} ${noun}`}</span>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Previous page" disabled={p.page === 0} onClick={() => p.setPage(p.page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="tabular-nums">{p.page + 1} / {p.pages}</span>
        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Next page" disabled={p.page >= p.pages - 1} onClick={() => p.setPage(p.page + 1)}><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

export function TableWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("overflow-x-auto", className)}>{children}</div>;
}
