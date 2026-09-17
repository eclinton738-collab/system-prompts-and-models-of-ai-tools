"use client";

import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Skeleton } from "@/components/ui/Table";
import type { Delta } from "@/lib/domain/stats";

const TONE_BAR: Record<string, string> = {
  red: "bg-acl-red",
  green: "bg-ok",
  blue: "bg-info",
  gold: "bg-gold",
  amber: "bg-warn",
};

const TONE_ICON: Record<string, string> = {
  red: "text-acl-red bg-acl-red/12 border-acl-red/30",
  green: "text-ok bg-ok/12 border-ok/30",
  blue: "text-info bg-info/12 border-info/30",
  gold: "text-gold bg-gold/12 border-gold/30",
  amber: "text-warn bg-warn/12 border-warn/30",
};

export function KpiCard({
  label,
  value,
  suffix,
  sub,
  icon,
  tone = "red",
  progress,
  progressLabel,
  delta,
  footer,
}: {
  label: string;
  value: string;
  suffix?: string;
  sub?: string;
  icon: React.ReactNode;
  tone?: keyof typeof TONE_BAR;
  progress?: number;
  progressLabel?: string;
  delta?: Delta;
  footer?: React.ReactNode;
}) {
  const DeltaIcon = delta?.direction === "up" ? ArrowUpRight : delta?.direction === "down" ? ArrowDownRight : Minus;

  return (
    <Panel accent className="flex flex-col p-3.5">
      <div className="flex items-start gap-3">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] border", TONE_ICON[tone])}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="acl-stat text-[25px] leading-none text-ink">{value}</span>
            {suffix ? <span className="font-display text-[14px] font-bold text-ink-4">{suffix}</span> : null}
          </div>
          <p className="acl-label mt-1.5 !text-[9.5px]">{label}</p>
        </div>
        {delta ? (
          <span
            className={cn(
              "flex shrink-0 items-center gap-0.5 rounded-[2px] border px-1.5 py-0.5 font-mono text-[10px] font-semibold",
              delta.direction === "up"
                ? "border-ok/30 bg-ok/10 text-ok"
                : delta.direction === "down"
                  ? "border-danger/30 bg-danger/10 text-danger"
                  : "border-hairline-strong bg-surface-3 text-ink-3",
            )}
            title={`${delta.value.toFixed(1)}% ${delta.label}`}
          >
            <DeltaIcon className="h-3 w-3" />
            {delta.value.toFixed(0)}%
          </span>
        ) : null}
      </div>

      {progress !== undefined ? (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1B1F26]">
              <div
                className={cn("h-full rounded-full transition-all duration-700", TONE_BAR[tone])}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <span className="font-mono text-[11px] font-semibold text-ink-2">
              {progressLabel ?? `${Math.round(progress)}%`}
            </span>
          </div>
          {sub ? <p className="mt-1.5 text-[11px] text-ink-4">{sub}</p> : null}
        </div>
      ) : sub ? (
        <p className="mt-2.5 text-[11px] text-ink-4">{sub}</p>
      ) : null}

      {footer}
    </Panel>
  );
}

export function KpiSkeleton() {
  return (
    <Panel className="p-3.5">
      <div className="flex items-start gap-3">
        <Skeleton className="h-9 w-9" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      </div>
      <Skeleton className="mt-4 h-1.5 w-full" />
    </Panel>
  );
}
