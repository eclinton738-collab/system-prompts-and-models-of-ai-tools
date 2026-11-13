"use client";

import { setDataSaver, useDataSaver } from "@/lib/data-saver";

type Props = { label: string; hint: string; onText: string; offText: string };

export function DataSaverToggle({ label, hint, onText, offText }: Props) {
  const on = useDataSaver();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setDataSaver(!on)}
      className="flex w-full items-center justify-between gap-4 rounded-md border border-line bg-surface px-4 py-3 text-left"
    >
      <span>
        <span className="block text-sm font-bold">{label}</span>
        <span className="block text-xs text-ash">{hint}</span>
      </span>
      <span className="flex items-center gap-2">
        <span className="label text-ash">{on ? onText : offText}</span>
        <span
          aria-hidden="true"
          className={`relative h-6 w-11 shrink-0 rounded-pill transition-colors duration-(--duration-fast) ${on ? "bg-ember" : "bg-line"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 size-5 rounded-pill bg-bone transition-transform duration-(--duration-fast) ${on ? "translate-x-5" : ""}`}
          />
        </span>
      </span>
    </button>
  );
}
