"use client";

import { useActionState, useState, useTransition } from "react";
import { startMfaEnrolment, verifyMfa, type MfaState } from "../actions";

type Props = { next: string; verifiedFactorId?: string; labels: Record<string, string> };

export function MfaForm({ next, verifiedFactorId, labels }: Props) {
  const [enrolment, setEnrolment] = useState<MfaState>({});
  const [starting, startTransition] = useTransition();
  const [state, verifyAction, verifying] = useActionState<MfaState, FormData>(verifyMfa, {});
  const factorId = verifiedFactorId ?? enrolment.factorId;
  const error = state.error ?? enrolment.error;

  if (!factorId) {
    return (
      <div className="space-y-4">
        {error && (
          <p role="alert" className="border-l-4 border-ember bg-surface-2 px-3 py-2 text-sm font-semibold">
            {labels[error] ?? labels.error_generic}
          </p>
        )}
        <button
          type="button"
          disabled={starting}
          onClick={() => startTransition(async () => setEnrolment(await startMfaEnrolment()))}
          className="btn btn-primary w-full"
        >
          {labels.mfa_start}
        </button>
      </div>
    );
  }

  return (
    <form action={verifyAction} className="space-y-4">
      {enrolment.qr && (
        <div className="space-y-3">
          <p className="text-sm text-ash">{labels.mfa_enroll_lede}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrolment.qr} alt={labels.mfa_qr_alt} width={200} height={200} className="bg-white p-2" />
          <p className="text-xs text-ash">
            {labels.mfa_secret} <code className="font-mono break-all text-bone">{enrolment.secret}</code>
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="border-l-4 border-ember bg-surface-2 px-3 py-2 text-sm font-semibold">
          {labels[error] ?? labels.error_generic}
        </p>
      )}
      <input type="hidden" name="factorId" value={factorId} />
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="mfa-code" className="label mb-1.5 block text-ash">
          {labels.mfa_code_label}
        </label>
        <input
          id="mfa-code"
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
        {labels.mfa_verify}
      </button>
    </form>
  );
}
