"use client";

import { useActionState } from "react";
import { grantRole, type ActionState } from "../actions";

type Props = { roles: { key: string; name: string }[]; labels: Record<string, string> };

export function GrantForm({ roles, labels }: Props) {
  const [state, action, pending] = useActionState<ActionState, FormData>(grantRole, {});
  return (
    <form action={action} className="card grid gap-3 p-4 md:grid-cols-[1fr_14rem_auto] md:items-end">
      <div>
        <label htmlFor="identifier" className="label mb-1.5 block text-ash">
          {labels.identifier}
        </label>
        <input id="identifier" name="identifier" required className="field" />
      </div>
      <div>
        <label htmlFor="role" className="label mb-1.5 block text-ash">
          {labels.role}
        </label>
        <select id="role" name="role" required className="field">
          {roles.map((role) => (
            <option key={role.key} value={role.key}>
              {role.name}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary">
        {labels.grant}
      </button>
      {state.message && (
        <p role="status" className={`text-sm font-semibold md:col-span-3 ${state.ok ? "text-ok" : "text-ember-bright"}`}>
          {labels[state.message] ?? state.message}
        </p>
      )}
    </form>
  );
}
