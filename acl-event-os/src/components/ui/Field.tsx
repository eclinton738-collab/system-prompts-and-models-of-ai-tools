"use client";

import { cn } from "@/lib/utils";
import { forwardRef, useId } from "react";

export function Field({
  label,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="acl-label mb-1.5 block">
        {label}
        {required ? <span className="ml-1 text-acl-red">*</span> : null}
      </span>
      {children}
      {error ? (
        <span role="alert" className="mt-1.5 block text-[11px] font-medium text-danger">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-[11px] text-ink-3">{hint}</span>
      ) : null}
    </label>
  );
}

const base =
  "w-full rounded-[3px] border bg-[#08090C] px-3 text-[13px] text-ink placeholder:text-ink-4 transition-colors focus:border-acl-red focus:outline-none focus:ring-1 focus:ring-acl-red/40 disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...props }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(base, "h-9", invalid ? "border-danger" : "border-hairline-strong", className)}
        {...props}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ className, invalid, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          base,
          "h-9 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236E7683%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat pr-8",
          invalid ? "border-danger" : "border-hairline-strong",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(base, "min-h-[76px] py-2 leading-relaxed", invalid ? "border-danger" : "border-hairline-strong", className)}
        {...props}
      />
    );
  },
);

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 border-b border-hairline py-3 last:border-0">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-[13px] font-medium text-ink">
          {label}
        </label>
        {description ? <p className="mt-0.5 text-[11px] leading-relaxed text-ink-3">{description}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-[22px] w-10 shrink-0 rounded-full border transition-colors",
          checked ? "border-acl-red bg-acl-red/30" : "border-hairline-strong bg-surface-3",
        )}
      >
        <span
          className={cn(
            "absolute top-[2px] h-4 w-4 rounded-full transition-all",
            checked ? "left-[20px] bg-acl-red-bright" : "left-[2px] bg-ink-3",
          )}
        />
      </button>
    </div>
  );
}
