"use client";

import { useActionState } from "react";
import { saveSetting, type ActionState } from "../actions";

type Props = {
  setting?: { key: string; value: unknown; description: string | null; is_public: boolean };
  labels: Record<string, string>;
};

export function SettingForm({ setting, labels }: Props) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveSetting, {});
  const id = setting?.key ?? "new";
  const json = setting ? JSON.stringify(setting.value, null, 2) : "";

  return (
    <form action={action} className="card space-y-3 p-4">
      {setting ? (
        <>
          <input type="hidden" name="key" value={setting.key} />
          <h3 className="font-mono text-sm font-bold text-gold">{setting.key}</h3>
        </>
      ) : (
        <div>
          <label htmlFor={`key-${id}`} className="label mb-1.5 block text-ash">
            {labels.key}
          </label>
          <input id={`key-${id}`} name="key" required placeholder="section.name" className="field font-mono" />
        </div>
      )}
      <div>
        <label htmlFor={`value-${id}`} className="label mb-1.5 block text-ash">
          {labels.value}
        </label>
        <textarea
          id={`value-${id}`}
          name="value"
          required
          rows={Math.min(10, Math.max(1, json.split("\n").length))}
          defaultValue={json}
          spellCheck={false}
          className="field font-mono text-sm"
        />
      </div>
      <div>
        <label htmlFor={`description-${id}`} className="label mb-1.5 block text-ash">
          {labels.description}
        </label>
        <input id={`description-${id}`} name="description" defaultValue={setting?.description ?? ""} className="field text-sm" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="is_public" defaultChecked={setting?.is_public ?? true} className="size-5 accent-ember" />
          {labels.public}
        </label>
        <div className="flex items-center gap-3">
          {state.message && (
            <p role="status" className={`text-sm font-semibold ${state.ok ? "text-ok" : "text-ember-bright"}`}>
              {labels[state.message] ?? state.message}
            </p>
          )}
          <button type="submit" disabled={pending} className="btn btn-primary">
            {setting ? labels.save : labels.add}
          </button>
        </div>
      </div>
    </form>
  );
}
