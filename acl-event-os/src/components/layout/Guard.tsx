"use client";

import { Lock } from "lucide-react";
import { useAcl } from "@/lib/client/provider";
import { Panel } from "@/components/ui/Panel";
import { ROLE_LABEL } from "@/lib/domain/permissions";
import type { Permission } from "@/lib/domain/permissions";

/**
 * Page-level permission gate.
 *
 * Convenience only — every mutating API route re-checks the acting role, so a
 * user who reaches a screen they should not see still cannot change anything.
 */
export function Guard({ permission, children }: { permission: Permission; children: React.ReactNode }) {
  const { allows, role, loading } = useAcl();
  if (loading) return null;
  if (allows(permission)) return <>{children}</>;

  return (
    <div className="p-4 sm:p-5">
      <Panel className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-hairline-strong bg-surface-2 text-ink-4">
          <Lock className="h-5 w-5" />
        </span>
        <h2 className="font-display text-[16px] font-extrabold uppercase tracking-[0.06em] text-ink">
          Restricted
        </h2>
        <p className="max-w-md text-[12.5px] leading-relaxed text-ink-3">
          The <span className="text-ink">{ROLE_LABEL[role]}</span> role does not have access to this area.
          Switch operator from the profile menu, or ask a Super Admin to grant the{" "}
          <code className="font-mono text-[11.5px] text-acl-red-bright">{permission}</code> permission.
        </p>
      </Panel>
    </div>
  );
}
