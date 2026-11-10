import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/jetbrains-mono/500.css";
import "./globals.css";
import { Providers } from "@/components/providers";
import { themeBootScript } from "@/components/theme";

export const metadata: Metadata = {
  title: { default: "ACL EVENT OS", template: "%s · ACL EVENT OS" },
  description: "Africa Combat League — event operations command center.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#07080A", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootScript }} /></head>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
