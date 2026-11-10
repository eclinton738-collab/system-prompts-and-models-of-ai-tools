"use client";

import { ListChecks } from "lucide-react";
import Link from "next/link";
import { Scanner } from "@/components/features/scanner";
import { CheckInAnalytics, SecurityFeed } from "@/components/features/widgets";
import { useOps } from "@/components/ops-provider";
import { EmptyState, PageHeader, Panel } from "@/components/ui";

export default function CheckInPage() {
  const { can } = useOps();
  return (
    <div>
      <PageHeader title="Check-In" subtitle="Gate control. One ticket, one entry — every scan is validated by the server and written to the audit log.">
        {can("checkin.log") && <Link href="/check-in/log" className="inline-flex h-10 items-center gap-2 border border-ink-500 bg-ink-800 px-4 font-display text-sm font-semibold uppercase tracking-[0.1em] hover:border-fg-dim hover:bg-ink-700"><ListChecks className="h-4 w-4" />View Check-In Log</Link>}
      </PageHeader>
      <div className="grid gap-4 2xl:grid-cols-[1fr_400px]">
        {can("checkin.scan") ? <Scanner /> : <Panel title="Live Check-In Scanner"><EmptyState icon={ListChecks} title="Scanning not permitted" body="Your role can review the check-in log but cannot admit guests." /></Panel>}
        <div className="grid content-start gap-4 md:grid-cols-2 2xl:grid-cols-1">
          <CheckInAnalytics showLink={false} />
          <SecurityFeed limit={8} />
        </div>
      </div>
    </div>
  );
}
