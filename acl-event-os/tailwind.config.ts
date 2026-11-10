import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#07080A", 900: "#0C0D10", 850: "#101114", 800: "#15171B", 700: "#1C1F25", 600: "#262A32", 500: "#363B45" },
        fg: { DEFAULT: "#F4F5F7", muted: "#A3A9B4", dim: "#6E7480" },
        acl: { DEFAULT: "#E11D2E", 600: "#C3141F", 700: "#9B0F18", glow: "#FF3B4A" },
        gold: { DEFAULT: "#D4AF37", light: "#EBCF74", dark: "#8C7120" },
        ok: "#2EBD73",
        info: "#4A90F0",
        warn: "#F0A020",
        danger: "#F04848",
      },
      fontFamily: {
        display: ["Barlow Condensed", "Arial Narrow", "sans-serif"],
        sans: ["Inter Variable", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: { DEFAULT: "2px", sm: "2px", md: "3px", lg: "4px" },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 32px -16px rgba(0,0,0,0.8)",
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
