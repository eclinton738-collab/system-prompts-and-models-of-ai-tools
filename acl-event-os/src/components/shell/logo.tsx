import { cn } from "@/lib/cn";

/** ACL mark: an octagon (the cage) cut by three claw strikes. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("h-10 w-10", className)} role="img" aria-label="ACL">
      {/* Solid fills only: the mark is rendered several times per page, and shared gradient ids break when one copy is hidden. */}
      <path d="M15 2h18l13 13v18L33 46H15L2 33V15z" fill="#E11D2E" />
      <path d="M2 33 46 15v18L33 46H15z" fill="#9B0F18" fillOpacity="0.55" />
      <path d="M15 2h18l13 13v18L33 46H15L2 33V15z" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <path d="M13 37 21 9h3l-6 28zM21 39 29 9h3l-6 30zM29 37 37 11h3l-6 26z" fill="#fff" />
    </svg>
  );
}

export function Logo({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className={compact ? "h-8 w-8" : "h-10 w-10"} />
      <div className="leading-none">
        <div className={cn("font-display font-bold tracking-[0.08em] text-fg", compact ? "text-xl" : "text-2xl")}>ACL</div>
        <div className="mt-0.5 font-display text-[9.5px] font-semibold uppercase tracking-[0.24em] text-fg-muted">Africa Combat League</div>
      </div>
    </div>
  );
}
