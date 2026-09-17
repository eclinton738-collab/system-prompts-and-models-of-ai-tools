"use client";

import { useState } from "react";
import { Sidebar, BottomNav } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useAcl } from "@/lib/client/provider";
import { AlertTriangle } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { error } = useAcl();

  return (
    <div className="flex min-h-dvh">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setMenuOpen(true)} />
        {error ? (
          <div className="flex items-center gap-2 border-b border-danger/40 bg-danger/10 px-4 py-2 text-[12px] text-danger">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>{error} — retrying automatically.</span>
          </div>
        ) : null}
        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
        <footer className="hidden items-center justify-between gap-4 border-t border-hairline px-5 py-3 font-display text-[9px] font-bold uppercase tracking-[0.18em] text-ink-4 lg:flex">
          <span>ACL — Africa Combat League</span>
          <span className="text-ink-3">Fighters. Stories. Africa. The world.</span>
          <span>Built by fighters for fighters.</span>
        </footer>
      </div>
      <BottomNav />
    </div>
  );
}

/** Standard page chrome so every screen reads the same way. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-hairline px-4 py-4 sm:px-5">
      <div className="min-w-0">
        <p className="acl-label text-acl-red !text-[10px]">{eyebrow}</p>
        <h1 className="mt-1 font-display text-[22px] font-black uppercase leading-none tracking-[-0.02em] text-ink sm:text-[26px]">
          {title}
        </h1>
        {description ? <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-ink-3">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
