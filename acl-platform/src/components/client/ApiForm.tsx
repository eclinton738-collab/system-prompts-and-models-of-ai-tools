"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "email" | "password" | "tel" | "number" | "date" | "datetime-local" | "url" | "textarea" | "select" | "checkbox" | "multiselect" | "list" | "hidden";
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
  autoComplete?: string;
  half?: boolean;
  min?: number;
  max?: number;
  step?: number | "any";
  rows?: number;
};

type Values = Record<string, unknown>;

/**
 * Config-driven form used across the public site and the admin CMS.
 * Submits JSON to an API route, shows field-level validation errors,
 * and handles loading / success / failure states.
 */
export function ApiForm({
  endpoint,
  method = "POST",
  fields,
  initial = {},
  submitLabel = "Submit",
  successMessage,
  redirectTo,
  redirectFromData,
  refresh,
  resetOnSuccess,
  extra,
}: {
  endpoint: string;
  method?: "POST" | "PATCH" | "PUT";
  fields: FieldDef[];
  initial?: Values;
  submitLabel?: string;
  successMessage?: string;
  /** Navigate here after success. */
  redirectTo?: string;
  /** Build redirect from response, e.g. "/account/orders/{id}". */
  redirectFromData?: string;
  refresh?: boolean;
  resetOnSuccess?: boolean;
  /** Extra static values merged into the payload. */
  extra?: Values;
}) {
  const router = useRouter();
  const start = () => Object.fromEntries(fields.map((f) => [f.name, initial[f.name] ?? (f.type === "checkbox" ? false : f.type === "multiselect" ? [] : "")]));
  const [values, setValues] = useState<Values>(start);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "busy" | "done">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const set = (name: string, v: unknown) => setValues((s) => ({ ...s, [name]: v }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("busy");
    setErrors({});
    setMessage(null);
    const payload: Values = { ...extra };
    for (const f of fields) {
      const v = values[f.name];
      if (f.type === "number") payload[f.name] = v === "" || v == null ? null : Number(v);
      else if (f.type === "list") payload[f.name] = String(v ?? "").split(/\n|,/).map((s) => s.trim()).filter(Boolean);
      else if (f.type === "datetime-local" || f.type === "date") payload[f.name] = v ? new Date(String(v)).toISOString() : null;
      else if (typeof v === "string") payload[f.name] = v.trim() === "" && !f.required ? null : v;
      else payload[f.name] = v;
    }
    const res = await api<Record<string, unknown>>(endpoint, { method, body: payload, redirectOn401: !endpoint.includes("/auth/") });
    if (res.error) {
      setStatus("idle");
      setErrors(res.error.fields ?? {});
      setMessage(res.error.message);
      setFailed(true);
      return;
    }
    setStatus("done");
    setFailed(false);
    setMessage(successMessage ?? "Saved.");
    if (resetOnSuccess) setValues(start());
    const target = redirectFromData ? redirectFromData.replace(/\{(\w+)\}/g, (_, k) => String(res.data?.[k] ?? "")) : redirectTo;
    if (target) {
      router.push(target);
      router.refresh();
    } else if (refresh) router.refresh();
    if (!target) setTimeout(() => setStatus("idle"), 400);
  }

  return (
    <form onSubmit={onSubmit} noValidate={false} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        if (f.type === "hidden") return null;
        const id = `f-${f.name}`;
        const err = errors[f.name];
        const common = { id, name: f.name, required: f.required, "aria-invalid": err ? true : undefined, "aria-describedby": err ? `${id}-err` : f.help ? `${id}-help` : undefined } as const;
        const v = values[f.name];
        return (
          <div key={f.name} className={f.half ? "" : "sm:col-span-2"}>
            {f.type === "checkbox" ? (
              <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <input {...common} type="checkbox" checked={!!v} onChange={(e) => set(f.name, e.target.checked)} className="h-5 w-5 accent-[var(--color-red)]" />
                {f.label}
              </label>
            ) : (
              <>
                <label htmlFor={id} className="label">
                  {f.label} {f.required && <span className="text-red" aria-hidden>*</span>}
                </label>
                {f.type === "textarea" || f.type === "list" ? (
                  <textarea {...common} rows={f.rows ?? (f.type === "list" ? 3 : 5)} placeholder={f.placeholder} value={String(v ?? "")} onChange={(e) => set(f.name, e.target.value)} className="field" />
                ) : f.type === "select" ? (
                  <select {...common} value={String(v ?? "")} onChange={(e) => set(f.name, e.target.value)} className="field">
                    <option value="">{f.placeholder ?? "Select…"}</option>
                    {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === "multiselect" ? (
                  <div id={id} role="group" aria-label={f.label} className="flex flex-wrap gap-2">
                    {f.options?.map((o) => {
                      const arr = (v as string[]) ?? [];
                      const on = arr.includes(o.value);
                      return (
                        <button key={o.value} type="button" aria-pressed={on} onClick={() => set(f.name, on ? arr.filter((x) => x !== o.value) : [...arr, o.value])} className={`min-h-9 border px-3 text-sm ${on ? "border-gold bg-gold text-black" : "border-line text-fog hover:text-bone"}`}>
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input {...common} type={f.type ?? "text"} placeholder={f.placeholder} autoComplete={f.autoComplete} min={f.min} max={f.max} step={f.step} value={String(v ?? "")} onChange={(e) => set(f.name, e.target.value)} className="field" />
                )}
              </>
            )}
            {f.help && !err && <p id={`${id}-help`} className="mt-1 text-xs text-fog">{f.help}</p>}
            {err && <p id={`${id}-err`} className="mt-1 text-xs font-semibold text-red">{err}</p>}
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button type="submit" disabled={status === "busy"} className="btn btn-red">
          {status === "busy" ? "Working…" : submitLabel}
        </button>
        <p role="status" aria-live="polite" className="text-sm">
          {message && <span className={failed ? "text-red" : "text-win"}>{message}</span>}
        </p>
      </div>
    </form>
  );
}
