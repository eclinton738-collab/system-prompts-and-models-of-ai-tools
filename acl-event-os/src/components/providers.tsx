"use client";

import { RefreshCw, ServerCrash } from "lucide-react";
import { Toaster } from "sonner";
import { OpsProvider } from "./ops-provider";
import { AppShell } from "./shell/app-shell";
import { ThemeProvider, useTheme } from "./theme";
import { LogoMark } from "./shell/logo";
import { Button, ConfirmProvider, Skeleton } from "./ui";
import { UiProvider } from "./ui-context";

function BootSkeleton() {
  return (
    <div className="flex h-dvh" aria-busy="true" aria-label="Loading ACL Event OS">
      <div className="hidden w-[72px] border-r border-ink-600 bg-ink-900 md:block xl:w-[252px]"><div className="flex h-16 items-center justify-center border-b border-ink-600"><LogoMark /></div><div className="space-y-2 p-3">{Array.from({ length: 9 }, (_, i) => <Skeleton key={i} className="h-9" />)}</div></div>
      <div className="flex-1"><div className="h-16 border-b border-ink-600 bg-ink-900/80" /><div className="space-y-4 p-6"><Skeleton className="h-44" /><div className="grid grid-cols-2 gap-4 xl:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div><div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-72 lg:col-span-2" /><Skeleton className="h-72" /></div></div></div>
    </div>
  );
}

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme} position="top-right" richColors closeButton toastOptions={{ style: { borderRadius: 2, fontFamily: "inherit" } }} />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <OpsProvider fallback={<BootSkeleton />} errorView={(retry) => (
        <div className="flex h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
          <ServerCrash className="h-10 w-10 text-danger" />
          <div><p className="h-display text-2xl">Cannot reach Event OS</p><p className="mt-1 max-w-sm text-sm text-fg-muted">The operations server did not respond. Check the network and try again.</p></div>
          <Button variant="primary" onClick={retry}><RefreshCw className="h-4 w-4" />Retry</Button>
        </div>
      )}>
        <ConfirmProvider><UiProvider><AppShell>{children}</AppShell></UiProvider></ConfirmProvider>
      </OpsProvider>
      <ThemedToaster />
    </ThemeProvider>
  );
}
