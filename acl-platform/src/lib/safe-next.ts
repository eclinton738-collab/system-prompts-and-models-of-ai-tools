/** Only allow same-site relative redirect targets (prevents open redirects). */
export function safeNext(next: string | undefined | null, fallback = "/account"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
