import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Panel({
  className,
  children,
  accent = false,
  flat = false,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { accent?: boolean; flat?: boolean; children?: ReactNode }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        flat ? "acl-panel-flat" : "acl-panel",
        accent && "acl-accent-top",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  subtitle,
  icon,
  action,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-hairline px-4 py-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {icon ? <span className="text-acl-red shrink-0">{icon}</span> : null}
        <div className="min-w-0">
          <h2 className="acl-label truncate text-ink !text-[11px]">{title}</h2>
          {subtitle ? <p className="mt-0.5 truncate text-[11px] text-ink-3">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}
