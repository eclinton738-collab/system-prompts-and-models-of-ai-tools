"use client";

import { FileBarChart, Send, Store, Ticket, UserPlus, Wine } from "lucide-react";
import { useRouter } from "next/navigation";
import { EventHero } from "@/components/features/hero";
import { CheckInAnalytics, DistributionPanel, KpiCards, PaymentMethodsPanel, RecentSalesTable, RecentScanCard, RevenuePanel, SalesByTypeTable, SalesTrendPanel, SecurityFeed } from "@/components/features/widgets";
import { useOps } from "@/components/ops-provider";
import { Panel } from "@/components/ui";
import { useUi } from "@/components/ui-context";
import { cn } from "@/lib/cn";
import type { Permission } from "@/lib/types";

function QuickActions() {
  const { can } = useOps();
  const { openSell, openSend } = useUi();
  const router = useRouter();
  const actions: { label: string; hint: string; icon: React.ComponentType<{ className?: string }>; perm: Permission; run: () => void; primary?: boolean; gold?: boolean }[] = [
    { label: "Sell Ticket", hint: "Open checkout", icon: Ticket, perm: "tickets.sell", run: () => openSell(), primary: true },
    { label: "Add Attendee", hint: "Register a guest", icon: UserPlus, perm: "tickets.sell", run: () => openSell({ mode: "attendee" }) },
    { label: "Create Table Booking", hint: "Executive & Royal", icon: Wine, perm: "tickets.sell", run: () => openSell({ mode: "table" }), gold: true },
    { label: "Generate Report", hint: "CSV & print", icon: FileBarChart, perm: "reports.view", run: () => router.push("/reports") },
    { label: "Send E-Ticket", hint: "Email, SMS, WhatsApp", icon: Send, perm: "tickets.send", run: () => openSend() },
    { label: "Manage Agents", hint: "POS network", icon: Store, perm: "agents.view", run: () => router.push("/agents") },
  ];
  return (
    <Panel title="Quick Actions">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {actions.map((a) => { const allowed = can(a.perm); return (
          <button key={a.label} type="button" disabled={!allowed} onClick={a.run} title={allowed ? undefined : "Your role does not have access"}
            className={cn("group flex min-h-[84px] flex-col justify-between border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40",
              a.primary ? "border-acl bg-acl text-white enabled:hover:bg-acl-600" : a.gold ? "border-gold/50 bg-gold/10 enabled:hover:bg-gold/20" : "border-ink-500 bg-ink-900 enabled:hover:border-fg-dim enabled:hover:bg-ink-800")}>
            <a.icon className={cn("h-5 w-5", a.primary ? "text-white" : a.gold ? "text-gold-light" : "text-fg-muted")} />
            <span><span className="block font-display text-sm font-bold uppercase tracking-[0.1em]">{a.label}</span><span className={cn("block text-xs", a.primary ? "text-white/75" : "text-fg-dim")}>{a.hint}</span></span>
          </button>
        ); })}
      </div>
    </Panel>
  );
}

export default function DashboardPage() {
  const { can } = useOps();
  return (
    <div className="space-y-4">
      <EventHero />
      <KpiCards />
      <div className="grid gap-4 xl:grid-cols-3">
        <SalesTrendPanel className="xl:col-span-2" />
        <DistributionPanel />
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <RevenuePanel />
        <PaymentMethodsPanel />
        <SalesByTypeTable className="lg:col-span-2 xl:col-span-1" />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <RecentSalesTable className="xl:col-span-2" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          <RecentScanCard />
          <CheckInAnalytics />
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {can("security.view", "checkin.log") && <SecurityFeed />}
        <div className="flex flex-col gap-4">
          <QuickActions />
          <div className="arena relative flex flex-1 flex-col justify-end overflow-hidden border border-ink-600 p-5">
            <p className="h-display text-3xl leading-[0.95] sm:text-4xl">Fighters. Stories.<br />Africa. <span className="text-acl-glow">The World.</span></p>
            <p className="mt-3 font-display text-xs font-semibold uppercase tracking-[0.3em] text-fg-muted">ACL — Born to be great.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
