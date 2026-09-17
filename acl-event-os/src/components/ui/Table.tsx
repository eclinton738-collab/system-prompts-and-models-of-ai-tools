import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";

export function DataTable({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full min-w-[640px] border-collapse text-left">{children}</table>
    </div>
  );
}

export function Th({ children, className, align }: { children?: React.ReactNode; className?: string; align?: "right" | "center" }) {
  return (
    <th
      scope="col"
      className={cn(
        "acl-label sticky top-0 z-10 whitespace-nowrap border-b border-hairline bg-surface px-3 py-2.5 !text-[10px]",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  align,
  mono,
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "right" | "center";
  mono?: boolean;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "border-b border-hairline/70 px-3 py-2.5 text-[12.5px] text-ink-2",
        mono && "font-mono text-[11.5px] tracking-tight text-ink",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function Tr({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "transition-colors",
        onClick && "cursor-pointer hover:bg-surface-2 focus-visible:bg-surface-2",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function EmptyState({
  title,
  body,
  icon,
  action,
}: {
  title: string;
  body?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full border border-hairline-strong bg-surface-2 text-ink-4">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <p className="font-display text-[13px] font-bold uppercase tracking-[0.08em] text-ink-2">{title}</p>
      {body ? <p className="max-w-sm text-[12px] leading-relaxed text-ink-3">{body}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("acl-skeleton rounded-[3px]", className)} />;
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="px-3 py-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-3 border-b border-hairline/60 py-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn("h-3", c === 0 ? "w-[16%]" : c === 1 ? "w-[22%]" : "w-[12%]")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Pagination({
  page,
  pages,
  total,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  onPage: (p: number) => void;
}) {
  if (total === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-4 py-2.5">
      <p className="text-[11px] text-ink-3">
        Page <span className="font-mono text-ink-2">{page}</span> of{" "}
        <span className="font-mono text-ink-2">{pages}</span> · {total.toLocaleString()} records
      </p>
      <div className="flex gap-1.5">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="h-7 rounded-[3px] border border-hairline-strong px-2.5 font-display text-[10px] font-bold uppercase tracking-[0.1em] text-ink-2 transition-colors hover:border-acl-red/50 hover:text-ink disabled:opacity-35"
        >
          Prev
        </button>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="h-7 rounded-[3px] border border-hairline-strong px-2.5 font-display text-[10px] font-bold uppercase tracking-[0.1em] text-ink-2 transition-colors hover:border-acl-red/50 hover:text-ink disabled:opacity-35"
        >
          Next
        </button>
      </div>
    </div>
  );
}
