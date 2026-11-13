import "server-only";
import type { FieldDef } from "@/components/client/ApiForm";
import type { AdminResource } from "./resources";
import { RESOURCES } from "./resources";
import { relationOptions } from "./engine";
import { label } from "@/lib/format";

type Row = Record<string, unknown>;

/** Translates a resource definition into form fields + initial values for the shared ApiForm. */
export async function buildForm(r: AdminResource, row: Row | null, defaults: Record<string, string | undefined> = {}) {
  const options = await relationOptions(r);
  const fields: FieldDef[] = [];
  const initial: Row = {};
  for (const f of r.fields) {
    if (f.createOnly && row) continue;
    const base = { name: f.name, label: f.label, required: f.required, half: f.half, help: f.help };
    const v = row ? row[f.name] : defaults[f.name];
    switch (f.type) {
      case "relation": fields.push({ ...base, type: "select", options: options[f.relation!] }); initial[f.name] = v ?? ""; break;
      case "multirelation": {
        const rel = RESOURCES[f.relation!];
        fields.push({ ...base, type: "multiselect", options: options[f.relation!] });
        initial[f.name] = Array.isArray(v) ? (v as Row[]).map((x) => String(x[rel.idField ?? "id"])) : [];
        break;
      }
      case "select": fields.push({ ...base, type: "select", options: f.options!.map((o) => ({ value: o, label: /^[A-Z_]+$/.test(o) && o.length > 3 ? label(o) : o })) }); initial[f.name] = v ?? (f.required && !row ? f.options![0] : ""); break;
      case "multiselect": fields.push({ ...base, type: "multiselect", options: f.options!.map((o) => ({ value: o, label: o })) }); initial[f.name] = v ?? []; break;
      case "boolean": fields.push({ ...base, type: "checkbox", required: false }); initial[f.name] = v === undefined ? f.name === "active" || f.name === "salesOpen" : v === true || v === "true"; break;
      case "number": fields.push({ ...base, type: "number", step: f.int ? 1 : "any", min: 0 }); initial[f.name] = v ?? ""; break;
      case "datetime": fields.push({ ...base, type: "datetime-local" }); initial[f.name] = v instanceof Date ? v.toISOString() : v ?? ""; break;
      case "date": fields.push({ ...base, type: "date" }); initial[f.name] = v instanceof Date ? v.toISOString().slice(0, 10) : v ?? ""; break;
      case "list": fields.push({ ...base, type: "list" }); initial[f.name] = Array.isArray(v) ? v.join("\n") : ""; break;
      case "textarea": fields.push({ ...base, type: "textarea", rows: f.name === "body" || f.name === "story" ? 12 : 4 }); initial[f.name] = v ?? ""; break;
      case "password": fields.push({ ...base, type: "password", autoComplete: "new-password" }); initial[f.name] = ""; break;
      default: fields.push({ ...base, type: "text" }); initial[f.name] = v ?? "";
    }
  }
  return { fields, initial };
}
