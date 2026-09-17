import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";
import { AclProvider } from "@/lib/client/provider";
import { ToastProvider } from "@/components/ui/Toast";
import { AppShell } from "@/components/layout/AppShell";

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ACL EVENT OS — Africa Combat League",
  description:
    "Event operations command centre for the Africa Combat League: ticketing, payments, QR security, check-in and live event control.",
  applicationName: "ACL EVENT OS",
};

export const viewport: Viewport = {
  themeColor: "#08090C",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[200] focus:rounded-[3px] focus:bg-acl-red focus:px-3 focus:py-2 focus:text-[12px] focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        <ToastProvider>
          <AclProvider>
            <AppShell>
              <div id="main">{children}</div>
            </AppShell>
          </AclProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
