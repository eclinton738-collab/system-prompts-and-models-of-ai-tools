"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { NavItem } from "@/lib/nav";

type Props = { items: NavItem[]; moreLabel: string; overviewLabel: string; ariaLabel: string };

function isActive(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function DesktopNav({ items, moreLabel, overviewLabel, ariaLabel }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(null);
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  const primary = items.filter((item) => item.primary);
  const more = items.filter((item) => !item.primary);
  const linkClass = (active: boolean) =>
    `flex h-header items-center gap-1 border-b-2 px-2.5 text-[0.8125rem] font-bold uppercase tracking-wider whitespace-nowrap transition-colors duration-(--duration-fast) hover:text-bone ${
      active ? "border-ember text-bone" : "border-transparent text-ash"
    }`;

  const panel = (links: { label: string; path: string }[], align: "left" | "right" = "left") => (
    <ul
      className={`absolute top-full z-50 min-w-56 border border-line bg-surface py-2 shadow-2xl ${align === "right" ? "right-0" : "left-0"}`}
    >
      {links.map((link) => (
        <li key={link.path}>
          <Link
            href={link.path}
            onClick={() => setOpen(null)}
            aria-current={pathname === link.path ? "page" : undefined}
            className="block px-4 py-2.5 text-sm font-semibold text-bone hover:bg-surface-2"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  const caret = (
    <svg aria-hidden="true" viewBox="0 0 10 6" className="size-2.5 fill-current">
      <path d="M0 0h10L5 6z" />
    </svg>
  );

  return (
    <nav ref={ref} aria-label={ariaLabel} className="hidden lg:block">
      <ul className="flex items-center">
        {primary.map((item) => (
          <li key={item.key} className="relative">
            {item.children.length === 0 ? (
              <Link
                href={item.path}
                aria-current={pathname === item.path ? "page" : undefined}
                className={linkClass(isActive(pathname, item.path))}
              >
                {item.label}
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  aria-expanded={open === item.key}
                  onClick={() => setOpen(open === item.key ? null : item.key)}
                  className={linkClass(isActive(pathname, item.path))}
                >
                  {item.label}
                  {caret}
                </button>
                {open === item.key &&
                  panel([{ label: `${item.label}: ${overviewLabel}`, path: item.path }, ...item.children])}
              </>
            )}
          </li>
        ))}
        <li className="relative">
          <button
            type="button"
            aria-expanded={open === "more"}
            onClick={() => setOpen(open === "more" ? null : "more")}
            className={linkClass(more.some((item) => isActive(pathname, item.path)))}
          >
            {moreLabel}
            {caret}
          </button>
          {open === "more" && panel(more, "right")}
        </li>
      </ul>
    </nav>
  );
}
