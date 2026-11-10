"use client";

import { Moon, Sun } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Button } from "./ui";

export type Theme = "dark" | "light";
export const THEME_KEY = "acl_theme";

/**
 * Runs before first paint (see app/layout.tsx) so the page never flashes the
 * wrong theme. Dark is the ACL default; light applies only once someone picks it.
 */
export const themeBootScript = `(function(){var t="dark";try{if(localStorage.getItem("${THEME_KEY}")==="light")t="light"}catch(e){}document.documentElement.dataset.theme=t})()`;

const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({ theme: "dark", setTheme: () => {} });
export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, set] = useState<Theme>("dark");
  useEffect(() => { set(document.documentElement.dataset.theme === "light" ? "light" : "dark"); }, []);
  const setTheme = useCallback((t: Theme) => {
    set(t);
    document.documentElement.dataset.theme = t;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "light" ? "#F0F1F4" : "#07080A");
    try { localStorage.setItem(THEME_KEY, t); } catch { /* storage unavailable: choice lasts for this visit */ }
  }, []);
  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export function ThemeToggle({ withLabel }: { withLabel?: boolean }) {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;
  return (
    <Button variant={withLabel ? "secondary" : "ghost"} size={withLabel ? "md" : "icon"} className={withLabel ? "w-full" : undefined} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`} onClick={() => setTheme(next)}>
      <Icon className="h-[18px] w-[18px]" />{withLabel && `${next} mode`}
    </Button>
  );
}
