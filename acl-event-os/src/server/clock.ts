/**
 * Server clock. In demo mode the clock is pinned to event night so the product
 * shows a live event regardless of when it is run; it then advances in real time.
 */
const DEMO_START = Date.parse("2026-09-26T19:42:30+01:00");
const g = globalThis as unknown as { __aclBoot?: number };
g.__aclBoot ??= Date.now();

export const isDemoClock = () => process.env.ACL_CLOCK !== "real";
export const DEMO_START_MS = DEMO_START;

export function nowMs() {
  return isDemoClock() ? DEMO_START + (Date.now() - g.__aclBoot!) : Date.now();
}
export const nowIso = () => new Date(nowMs()).toISOString();
