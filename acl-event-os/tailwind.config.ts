import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Every colour is a CSS variable so the same classes serve both themes (see globals.css).
      colors: {
        ink: { 950: v("ink-950"), 900: v("ink-900"), 850: v("ink-850"), 800: v("ink-800"), 700: v("ink-700"), 600: v("ink-600"), 500: v("ink-500") },
        fg: { DEFAULT: v("fg"), muted: v("fg-muted"), dim: v("fg-dim") },
        acl: { DEFAULT: "#E11D2E", 600: "#C3141F", 700: "#9B0F18", glow: v("acl-glow") },
        gold: { DEFAULT: v("gold"), light: v("gold-light"), dark: "#8C7120" },
        ok: v("ok"),
        info: v("info"),
        warn: v("warn"),
        danger: v("danger"),
        /** Neutral overlay: white on dark surfaces, black on light ones. */
        tint: v("tint"),
      },
      fontFamily: {
        display: ["Barlow Condensed", "Arial Narrow", "sans-serif"],
        sans: ["Inter Variable", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: { DEFAULT: "2px", sm: "2px", md: "3px", lg: "4px" },
      boxShadow: {
        panel: "var(--shadow-panel)",
        glow: "0 0 0 1px rgba(225,29,46,0.5), 0 0 28px -4px rgba(225,29,46,0.45)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-in": { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        "rise": { from: { opacity: "0", transform: "translateY(8px) scale(0.985)" }, to: { opacity: "1", transform: "translateY(0) scale(1)" } },
        "pulse-dot": { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.35" } },
        "scanline": { "0%": { top: "6%" }, "50%": { top: "92%" }, "100%": { top: "6%" } },
        "verdict": { "0%": { transform: "scale(0.94)", opacity: "0" }, "60%": { transform: "scale(1.01)", opacity: "1" }, "100%": { transform: "scale(1)" } },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
        "slide-in": "slide-in 200ms cubic-bezier(0.2,0.8,0.2,1)",
        rise: "rise 180ms cubic-bezier(0.2,0.8,0.2,1)",
        "pulse-dot": "pulse-dot 1.6s ease-in-out infinite",
        scanline: "scanline 2.6s ease-in-out infinite",
        verdict: "verdict 260ms cubic-bezier(0.2,0.8,0.2,1)",
      },
    },
  },
  plugins: [],
};
export default config;
