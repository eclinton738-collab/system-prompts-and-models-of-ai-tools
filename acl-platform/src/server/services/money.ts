import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "../db";
import { money } from "@/lib/format";

export const CURRENCY_COOKIE = "acl_currency";

export const getCurrencies = cache(() => db.currency.findMany({ orderBy: { code: "asc" } }));

/**
 * Returns a price formatter for this request. Prices are charged in their stored
 * currency; when the visitor picked a different display currency we show an
 * approximate conversion alongside using admin-maintained rates.
 */
export const getMoney = cache(async () => {
  const [currencies, jar] = await Promise.all([getCurrencies(), cookies()]);
  const display = jar.get(CURRENCY_COOKIE)?.value;
  const rate = (code: string) => currencies.find((c) => c.code === code)?.perUsd;
  const fmt = (minor: number, currency: string): string => {
    const base = money(minor, currency);
    const from = rate(currency);
    const to = display ? rate(display) : undefined;
    if (!display || display === currency || !from || !to) return base;
    return `${base} (≈ ${money(Math.round((minor / from) * to), display)})`;
  };
  return { fmt, display: display ?? null, currencies };
});
