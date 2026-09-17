"use client";

import { cn } from "@/lib/utils";

export function Tabs<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string; count?: number }>;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn("inline-flex flex-wrap gap-0.5 rounded-[3px] border border-hairline bg-[#08090C] p-0.5", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-[2px] font-display font-bold uppercase tracking-[0.1em] transition-colors",
              size === "sm" ? "px-2 py-1 text-[9.5px]" : "px-3 py-1.5 text-[10px]",
              active ? "bg-acl-red text-white" : "text-ink-3 hover:bg-surface-2 hover:text-ink-2",
            )}
          >
            {option.label}
            {option.count !== undefined ? (
              <span className={cn("ml-1.5 font-mono", active ? "text-white/70" : "text-ink-4")}>{option.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
