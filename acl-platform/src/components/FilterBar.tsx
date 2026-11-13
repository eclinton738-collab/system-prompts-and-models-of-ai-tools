import Link from "next/link";

export type FilterDef = { name: string; label: string; options: { value: string; label: string }[]; value?: string } | { name: string; label: string; type: "search" | "number"; value?: string; placeholder?: string };

/** GET-form filter bar: works without JavaScript, produces shareable, crawlable URLs. */
export function FilterBar({ action, filters, hidden }: { action: string; filters: FilterDef[]; hidden?: Record<string, string | undefined> }) {
  const active = filters.some((f) => f.value);
  return (
    <form action={action} method="get" className="card grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:p-4 lg:grid-cols-6" role="search" aria-label="Filters">
      {hidden && Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      {filters.map((f) => (
        <div key={f.name} className={"type" in f && f.type === "search" ? "col-span-2" : ""}>
          <label htmlFor={`flt-${f.name}`} className="label">{f.label}</label>
          {"options" in f ? (
            <select id={`flt-${f.name}`} name={f.name} defaultValue={f.value ?? ""} className="field">
              <option value="">All</option>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input id={`flt-${f.name}`} name={f.name} type={f.type === "number" ? "number" : "search"} defaultValue={f.value ?? ""} placeholder={f.placeholder} className="field" />
          )}
        </div>
      ))}
      <div className="col-span-2 flex items-end gap-2 sm:col-span-1">
        <button type="submit" className="btn btn-red flex-1">Apply</button>
        {active && <Link href={action} className="btn btn-ghost">Reset</Link>}
      </div>
    </form>
  );
}
