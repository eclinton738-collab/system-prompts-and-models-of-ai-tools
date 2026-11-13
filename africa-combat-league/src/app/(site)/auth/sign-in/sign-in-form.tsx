"use client";

import Script from "next/script";
import { useActionState, useState } from "react";
import { requestCode, signInWithGoogle, verifyCode, type AuthState } from "../actions";

type Props = { next: string; turnstileSiteKey: string; labels: Record<string, string>; initialError?: string };

export function SignInForm({ next, turnstileSiteKey, labels, initialError }: Props) {
  const [channel, setChannel] = useState<"email" | "phone">("email");
  const [restart, setRestart] = useState(0);
  const [sent, sendAction, sending] = useActionState<AuthState, FormData>(requestCode, {
    step: "request",
    error: initialError,
  });
  const [verified, verifyAction, verifying] = useActionState<AuthState, FormData>(verifyCode, { step: "verify" });
  const [dismissedFor, setDismissedFor] = useState<AuthState | null>(null);
  const verifyStep = sent.step === "verify" && dismissedFor !== sent;
  const error = verifyStep ? verified.error : sent.error;

  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="border-l-4 border-ember bg-surface-2 px-3 py-2 text-sm font-semibold">
          {labels[error] ?? labels.error_generic}
        </p>
      )}

      {verifyStep ? (
        <form action={verifyAction} className="space-y-4">
          <p className="text-sm text-ash" role="status">
            {(sent.channel === "phone" ? labels.code_sent_phone : labels.code_sent_email).replace(
              "{target}",
              sent.target ?? "",
            )}
          </p>
          <input type="hidden" name="channel" value={sent.channel} />
          <input type="hidden" name="target" value={sent.target} />
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="code" className="label mb-1.5 block text-ash">
              {labels.code_label}
            </label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              className="field text-center text-2xl font-bold tracking-[0.5em]"
            />
          </div>
          <button type="submit" disabled={verifying} className="btn btn-primary w-full">
            {labels.verify}
          </button>
          <button
            type="button"
            onClick={() => {
              setDismissedFor(sent);
              setRestart((count) => count + 1);
            }}
            className="w-full text-sm text-ash underline underline-offset-4 hover:text-bone"
          >
            {labels.start_over}
          </button>
        </form>
      ) : (
        <>
          <div role="tablist" aria-label={labels.title} className="grid grid-cols-2 border border-line">
            {(["email", "phone"] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                id={`tab-${option}`}
                aria-selected={channel === option}
                aria-controls="sign-in-panel"
                onClick={() => setChannel(option)}
                className={`label min-h-11 ${channel === option ? "bg-bone text-ink" : "text-ash hover:text-bone"}`}
              >
                {option === "email" ? labels.tab_email : labels.tab_phone}
              </button>
            ))}
          </div>

          <form
            key={restart}
            action={sendAction}
            id="sign-in-panel"
            role="tabpanel"
            aria-labelledby={`tab-${channel}`}
            className="space-y-4"
          >
            <input type="hidden" name="channel" value={channel} />
            <input type="hidden" name="next" value={next} />
            {channel === "email" ? (
              <div>
                <label htmlFor="email" className="label mb-1.5 block text-ash">
                  {labels.email_label}
                </label>
                <input id="email" name="email" type="email" autoComplete="email" required className="field" />
              </div>
            ) : (
              <div>
                <label htmlFor="phone" className="label mb-1.5 block text-ash">
                  {labels.phone_label}
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0801 234 5678"
                  aria-describedby="phone-hint"
                  required
                  className="field"
                />
                <p id="phone-hint" className="mt-1.5 text-xs text-ash">
                  {labels.phone_hint}
                </p>
              </div>
            )}
            {turnstileSiteKey && (
              <>
                <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
                <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-theme="dark" data-size="flexible" />
              </>
            )}
            <button type="submit" disabled={sending} className="btn btn-primary w-full">
              {labels.send_code}
            </button>
          </form>

          <div className="flex items-center gap-3 text-ash" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            <span className="label">{labels.or}</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value={next} />
            <button type="submit" className="btn btn-ghost w-full">
              {labels.google}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
