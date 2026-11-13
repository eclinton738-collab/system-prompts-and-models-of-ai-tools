import "server-only";

/**
 * Verify a Cloudflare Turnstile token on the server. Use on every public form
 * that the app handles itself (applications, contact, data requests).
 * Auth forms pass the token to Supabase Auth, which verifies it there.
 * Returns true when Turnstile is not configured so local dev still works.
 */
export async function verifyTurnstile(token: string | null | undefined, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      cache: "no-store",
    });
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}
