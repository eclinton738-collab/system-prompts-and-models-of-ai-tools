"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ticket, UserPlus, Grid3x3, FileText, Send, Store } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { SellTicketModal } from "@/components/ticketing/SellTicketModal";
import { ResendTicketModal } from "@/components/ticketing/ResendTicketModal";
import { useAcl } from "@/lib/client/provider";
import type { Permission } from "@/lib/domain/permissions";

export function QuickActions() {
  const router = useRouter();
  const { allows } = useAcl();
  const [sell, setSell] = useState(false);
  const [resend, setResend] = useState(false);

  const actions: Array<{
    label: string;
    icon: React.ElementType;
    onClick: () => void;
    permission: Permission;
    accent?: boolean;
  }> = [
    { label: "Sell Ticket", icon: Ticket, onClick: () => setSell(true), permission: "ticketing.sell", accent: true },
    { label: "Add Attendee", icon: UserPlus, onClick: () => setSell(true), permission: "ticketing.sell" },
    { label: "Table Booking", icon: Grid3x3, onClick: () => router.push("/seating?book=1"), permission: "seating.reserve" },
    { label: "Generate Report", icon: FileText, onClick: () => router.push("/reports"), permission: "reports.view" },
    { label: "Send E-Ticket", icon: Send, onClick: () => setResend(true), permission: "attendees.resend_ticket" },
    { label: "Manage Agents", icon: Store, onClick: () => router.push("/agents"), permission: "agents.view" },
  ];

  const visible = actions.filter((a) => allows(a.permission));
  if (!visible.length) return null;

  return (
    <>
      <Panel>
        <PanelHeader title="Quick Actions" />
        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
          {visible.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={action.onClick}
                className={`group flex flex-col items-start gap-2 rounded-[3px] border p-3 text-left transition-all ${
                  action.accent
                    ? "border-acl-red/40 bg-acl-red/[0.07] hover:border-acl-red hover:bg-acl-red/[0.13]"
                    : "border-hairline-strong bg-surface-2 hover:border-acl-red/50 hover:bg-surface-3"
                }`}
              >
                <Icon className={`h-4 w-4 ${action.accent ? "text-acl-red-bright" : "text-ink-3 group-hover:text-acl-red"}`} />
                <span className="font-display text-[10.5px] font-bold uppercase leading-tight tracking-[0.08em] text-ink">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </Panel>
      <SellTicketModal open={sell} onClose={() => setSell(false)} />
      <ResendTicketModal open={resend} onClose={() => setResend(false)} />
    </>
  );
}
