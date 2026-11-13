"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import type { NavItem } from "@/lib/nav";

type Props = {
  items: NavItem[];
  bottomKeys: readonly string[];
  labels: { menu: string; close: string; nav: string; overview: string; account: string; home: string };
  /** Rendered inside the menu sheet (Data saver toggle). */
  children?: ReactNode;
};

const icons: Record<string, ReactNode> = {
  events: <path d="M4 5h16v15H4zM4 10h16M8 3v4M16 3v4" />,
  watch: <path d="M3 5h18v12H3zM10 8.5v5l4.5-2.5zM8 21h8" />,
  fighters: <path d="M7 11V7a3 3 0 0 1 3-3h4a4 4 0 0 1 4 4v5a4 4 0 0 1-4 4H9a3 3 0 0 1-3-3v-1a2 2 0 0 1 2-2h6M8 17v3h8v-3" />,
  lions_den: <path d="M3 20V9l9-5 9 5v11M3 20h18M9 20v-6h6v6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
};

function Icon({ name }: { name: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-6 fill-none stroke-current"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icons[name]}
    </svg>
  );
}

export function MobileNav({ items, bottomKeys, labels, children }: Props) {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const bottom = bottomKeys.map((key) => items.find((item) => item.key === key)).filter((item) => !!item);

  // Close the sheet after navigating.
  useEffect(() => {
    dialog.current?.close();
  }, [pathname]);

  const tab = (active: boolean) =>
    `flex h-bottomnav flex-1 flex-col items-center justify-center gap-1 text-[0.625rem] font-bold uppercase tracking-wider ${
      active ? "text-bone" : "text-ash"
    }`;

  return (
    <>
      <nav
        aria-label={labels.nav}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="flex">
          {bottom.map((item) => {
            const active = pathname === item.path || pathname.startsWith(`${item.path}/`);
            return (
              <li key={item.key} className="flex flex-1">
                <Link href={item.path} aria-current={active ? "page" : undefined} className={tab(active)}>
                  <span className={active ? "text-ember-bright" : undefined}>
                    <Icon name={item.key} />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li className="flex flex-1">
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => dialog.current?.showModal()}
              className={tab(false)}
            >
              <Icon name="menu" />
              {labels.menu}
            </button>
          </li>
        </ul>
      </nav>

      <dialog
        ref={dialog}
        aria-label={labels.menu}
        onClick={(event) => event.target === dialog.current && dialog.current?.close()}
        className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-lg border-t border-line bg-ink p-0 text-bone lg:hidden"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-ink px-4 py-3">
          <p className="display text-display-sm">{labels.menu}</p>
          <button type="button" onClick={() => dialog.current?.close()} className="btn btn-ghost min-h-10 px-3 py-1">
            {labels.close}
          </button>
        </div>
        <div className="space-y-4 px-4 py-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <ul className="divide-y divide-line border-y border-line">
            <li>
              <Link href="/" className="display block py-3 text-2xl">
                {labels.home}
              </Link>
            </li>
            {items.map((item) =>
              item.children.length === 0 ? (
                <li key={item.key}>
                  <Link href={item.path} className="display block py-3 text-2xl">
                    {item.label}
                  </Link>
                </li>
              ) : (
                <li key={item.key}>
                  <details className="group">
                    <summary className="display flex cursor-pointer list-none items-center justify-between py-3 text-2xl [&::-webkit-details-marker]:hidden">
                      {item.label}
                      <span aria-hidden="true" className="font-sans text-xl text-ash group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <ul className="pb-3 pl-1">
                      {[{ key: `${item.key}-overview`, label: labels.overview, path: item.path, children: [] as NavItem[] }, ...item.children].map(
                        (child) => (
                          <li key={child.key}>
                            <Link href={child.path} className="block py-2.5 font-semibold text-ash">
                              {child.label}
                            </Link>
                            {child.children.length > 0 && (
                              <ul className="pl-4">
                                {child.children.map((leaf) => (
                                  <li key={leaf.key}>
                                    <Link href={leaf.path} className="block py-2.5 text-sm font-semibold text-ash">
                                      {leaf.label}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        ),
                      )}
                    </ul>
                  </details>
                </li>
              ),
            )}
          </ul>
          {children}
          <Link href="/account" className="btn btn-primary w-full">
            {labels.account}
          </Link>
        </div>
      </dialog>
    </>
  );
}
