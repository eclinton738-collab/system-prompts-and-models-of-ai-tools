"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured, siteUrl, turnstileSiteKey } from "@/lib/env";
import { toE164 } from "@/lib/contact";
import { safeNext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  step: "request" | "verify";
  channel?: "email" | "phone";
  target?: string;
  /** i18n key under `auth.` */
  error?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Step 1: send a one-time code by email (with magic link) or SMS. */
export async function requestCode(_: AuthState, form: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { step: "request", error: "not_configured" };
  const channel = form.get("channel") === "phone" ? "phone" : "email";
  const next = safeNext(form.get("next"));
  const captchaToken = (form.get("cf-turnstile-response") as string | null) || undefined;
  if (turnstileSiteKey && !captchaToken) return { step: "request", channel, error: "error_captcha" };

  const supabase = await createClient();
  if (channel === "email") {
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    if (!EMAIL.test(email)) return { step: "request", channel, error: "error_invalid_email" };
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`, captchaToken },
    });
    if (error) return { step: "request", channel, error: "error_generic" };
    return { step: "verify", channel, target: email };
  }

  const phone = toE164(String(form.get("phone") ?? ""));
  if (!phone) return { step: "request", channel, error: "error_invalid_phone" };
  const { error } = await supabase.auth.signInWithOtp({ phone, options: { captchaToken } });
  if (error) return { step: "request", channel, error: "error_generic" };
  return { step: "verify", channel, target: phone };
}

/** Step 2: check the 6-digit code and start the session. */
export async function verifyCode(_: AuthState, form: FormData): Promise<AuthState> {
  const channel = form.get("channel") === "phone" ? "phone" : "email";
  const target = String(form.get("target") ?? "");
  const token = String(form.get("code") ?? "").replace(/\D/g, "");
  if (token.length !== 6) return { step: "verify", channel, target, error: "error_invalid_code" };

  const supabase = await createClient();
  const { error } =
    channel === "phone"
      ? await supabase.auth.verifyOtp({ phone: target, token, type: "sms" })
      : await supabase.auth.verifyOtp({ email: target, token, type: "email" });
  if (error) return { step: "verify", channel, target, error: "error_invalid_code" };
  redirect(safeNext(form.get("next")));
}

export async function signInWithGoogle(form: FormData) {
  if (!isSupabaseConfigured) redirect("/auth/sign-in");
  const next = safeNext(form.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/auth/sign-in?error=1");
  redirect(data.url);
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

export type MfaState = { factorId?: string; qr?: string; secret?: string; error?: string };

/** Start TOTP enrolment: returns a QR code for the authenticator app. */
export async function startMfaEnrolment(): Promise<MfaState> {
  const supabase = await createClient();
  // Clear half-finished enrolments so a fresh QR can be issued.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  await Promise.all(
    (factors?.all ?? [])
      .filter((factor) => factor.factor_type === "totp" && factor.status !== "verified")
      .map((factor) => supabase.auth.mfa.unenroll({ factorId: factor.id })),
  );
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `ACL ${Date.now()}` });
  if (error || !data) return { error: "error_generic" };
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/** Verify a TOTP code. Lifts the session to AAL2, which admin access requires. */
export async function verifyMfa(state: MfaState, form: FormData): Promise<MfaState> {
  const factorId = String(form.get("factorId") ?? "");
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  if (!factorId || code.length !== 6) return { ...state, error: "error_invalid_code" };
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { ...state, error: "error_invalid_code" };
  redirect(safeNext(form.get("next"), "/admin"));
}
