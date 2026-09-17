import { cn } from "@/lib/utils";

/** ACL crown mark. Drawn inline so the brand needs no binary asset. */
export function AclMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 34" className={cn("h-full w-auto", className)} aria-hidden focusable="false">
      <defs>
        <linearGradient id="acl-crown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F7D278" />
          <stop offset="55%" stopColor="#E4B13E" />
          <stop offset="100%" stopColor="#9A7318" />
        </linearGradient>
      </defs>
      <path
        d="M4 27h40l-3.4 5H7.4L4 27Z"
        fill="url(#acl-crown)"
      />
      <path
        d="M4 24 1.5 7.5 13 16 24 2l11 14 11.5-8.5L44 24H4Z"
        fill="url(#acl-crown)"
      />
      <circle cx="24" cy="2.5" r="2.5" fill="#F7D278" />
      <circle cx="1.8" cy="7" r="1.8" fill="#F7D278" />
      <circle cx="46.2" cy="7" r="1.8" fill="#F7D278" />
    </svg>
  );
}

export function AclLogo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex select-none flex-col items-center", className)}>
      <AclMark className={compact ? "h-3.5" : "h-5"} />
      <span
        className={cn(
          "font-display font-black leading-[0.82] tracking-[-0.03em] text-ink",
          compact ? "mt-1 text-[26px]" : "mt-1.5 text-[44px]",
        )}
      >
        ACL
      </span>
      {!compact ? (
        <>
          <span className="mt-1.5 font-display text-[8.5px] font-bold uppercase leading-none tracking-[0.2em] text-ink-2">
            Africa Combat League
          </span>
          <span className="mt-1.5 font-display text-[7px] font-semibold uppercase leading-none tracking-[0.16em] text-ink-4">
            Unchained. Unbreakable. Unbound.
          </span>
        </>
      ) : null}
    </div>
  );
}
