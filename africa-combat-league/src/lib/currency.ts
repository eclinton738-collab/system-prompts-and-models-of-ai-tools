/**
 * Money is stored as integer minor units (kobo, cents, pesewas) plus an ISO
 * currency code. NGN is the default; the rest are ready to switch on.
 */
export const supportedCurrencies = ["NGN", "USD", "GHS", "KES", "ZAR"] as const;
export type Currency = (typeof supportedCurrencies)[number];
export const defaultCurrency: Currency = "NGN";

const displayLocale: Record<Currency, string> = {
  NGN: "en-NG",
  USD: "en-US",
  GHS: "en-GH",
  KES: "en-KE",
  ZAR: "en-ZA",
};

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (supportedCurrencies as readonly string[]).includes(value);
}

export function formatMoney(amountMinor: number, currency: Currency = defaultCurrency): string {
  const amount = amountMinor / 100;
  return new Intl.NumberFormat(displayLocale[currency], {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}
