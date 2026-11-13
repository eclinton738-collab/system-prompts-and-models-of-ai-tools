import "server-only";
import { db } from "../db";
import { ApiError } from "../api";
import { audit } from "../audit";
import { can } from "../permissions";
import { RESOURCES, type AdminField, type AdminResource } from "./resources";
import { slugify } from "@/lib/format";

type Row = Record<string, unknown> & { id?: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const delegate = (r: AdminResource) => (db as any)[r.model];
const idOf = (r: AdminResource) => r.idField ?? "id";

export function getResource(key: string, role: string | undefined): AdminResource {
  const r = RESOURCES[key];
  if (!r) throw new ApiError(404, "not_found", "Unknown resource.");
  if (!can(role as never, r.permission)) throw new ApiError(403, "forbidden", "You do not have permission to manage this.");
  return r;
}

export const PAGE_SIZE = 25;

export async function listRows(r: AdminResource, opts: { q?: string; page?: number }) {
  const q = opts.q?.trim();
  const where = q && r.search ? { OR: r.search.map((f) => ({ [f]: { contains: q, mode: "insensitive" } })) } : {};
  const page = Math.max(1, opts.page ?? 1);
  const [rows, total] = await Promise.all([delegate(r).findMany({ where, include: r.include, orderBy: r.orderBy, take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE }), delegate(r).count({ where })]);
  return { rows: rows as Row[], total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getRow(r: AdminResource, id: string): Promise<Row | null> {
  const multi = Object.fromEntries(r.fields.filter((f) => f.type === "multirelation").map((f) => [f.name, { select: { [idOf(RESOURCES[f.relation!])]: true } }]));
  return delegate(r).findUnique({ where: { [idOf(r)]: id }, include: { ...r.include, ...multi } });
}

export async function relationOptions(r: AdminResource): Promise<Record<string, { value: string; label: string }[]>> {
  const out: Record<string, { value: string; label: string }[]> = {};
  for (const key of new Set(r.fields.filter((f) => f.relation).map((f) => f.relation!))) {
    const rel = RESOURCES[key];
    const rows: Row[] = await delegate(rel).findMany({ include: rel.include, orderBy: rel.orderBy, take: 600 });
    out[key] = rows.map((row) => ({ value: String(row[idOf(rel)]), label: rel.title(row) }));
  }
  return out;
}

function coerce(f: AdminField, v: unknown, errors: Record<string, string>, isCreate: boolean): unknown {
  const empty = v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
  if (empty) {
    if (f.required && f.type !== "boolean") errors[f.name] = "Required";
    if (f.type === "boolean") return false;
    if (f.type === "list" || f.type === "multiselect") return [];
    if (f.type === "multirelation") return isCreate ? undefined : { set: [] };
    return null;
  }
  switch (f.type) {
    case "number": {
      const n = Number(v);
      if (!Number.isFinite(n) || (f.int && !Number.isInteger(n))) errors[f.name] = f.int ? "Enter a whole number" : "Enter a number";
      else if (n < 0) errors[f.name] = "Cannot be negative";
      return n;
    }
    case "boolean":
      return v === true || v === "true";
    case "select":
      if (!f.options!.includes(String(v))) errors[f.name] = "Choose one of the listed options";
      return String(v);
    case "datetime":
    case "date": {
      const d = new Date(String(v));
      if (Number.isNaN(d.getTime())) errors[f.name] = "Enter a valid date";
      return d;
    }
    case "list":
    case "multiselect": {
      const arr = (Array.isArray(v) ? v : String(v).split(/\n/)).map((x) => String(x).trim()).filter(Boolean).slice(0, 50);
      if (f.type === "multiselect" && arr.some((x) => !f.options!.includes(x))) errors[f.name] = "Unknown option";
      return arr;
    }
    case "multirelation": {
      const rel = RESOURCES[f.relation!];
      const ids = (Array.isArray(v) ? v : []).map((x) => ({ [idOf(rel)]: String(x) }));
      return isCreate ? { connect: ids } : { set: ids };
    }
    default: {
      const str = String(v).trim();
      if (str.length > 20000) errors[f.name] = "Too long";
      if (/url$/i.test(f.name) && str && !/^(https?:\/\/|\/)/i.test(str)) errors[f.name] = "Must be an http(s) URL";
      return str;
    }
  }
}

export async function saveRow(r: AdminResource, id: string | null, input: Record<string, unknown>, actor: { id: string; role: string }): Promise<Row> {
  const isCreate = id === null;
  if (isCreate && r.noCreate) throw new ApiError(405, "not_allowed", "These records are created by the site, not in the CMS.");
  const before = isCreate ? null : await delegate(r).findUnique({ where: { [idOf(r)]: id } });
  if (!isCreate && !before) throw new ApiError(404, "not_found", "Record not found.");
  const errors: Record<string, string> = {};
  const data: Row = {};
  for (const f of r.fields) {
    if (f.createOnly && !isCreate) continue;
    if (!(f.name in input)) {
      if (isCreate && f.required && f.type !== "boolean") errors[f.name] = "Required";
      continue;
    }
    const v = coerce(f, input[f.name], errors, isCreate);
    if (v !== undefined) data[f.name] = v;
  }
  if (Object.keys(errors).length) throw new ApiError(422, "validation", "Please check the highlighted fields.", errors);

  if (r.fields.some((f) => f.name === "slug")) {
    const wanted = slugify(String(data.slug ?? "")) || (isCreate && r.slugFrom ? slugify(r.slugFrom(data)) : "");
    if (!wanted) delete data.slug;
    else {
      let slug = wanted;
      for (let n = 2; await delegate(r).findFirst({ where: { slug, NOT: isCreate ? undefined : { [idOf(r)]: id } } }); n++) slug = `${wanted}-${n}`;
      data.slug = slug;
    }
    if (isCreate && !data.slug && r.model !== "fight") throw new ApiError(422, "validation", "A URL slug could not be generated.", { slug: "Required" });
  }
  await r.beforeSave?.(data, { userId: actor.id, role: actor.role, isCreate, before });
  // Relation scalars are written directly (e.g. divisionId); null clears an optional relation.
  const row: Row = isCreate ? await delegate(r).create({ data }) : await delegate(r).update({ where: { [idOf(r)]: id }, data });
  const rid = String(row[idOf(r)]);
  await r.afterSave?.({ ...row, id: rid }, { userId: actor.id, role: actor.role, isCreate, before });
  const changed = Object.keys(data).filter((k) => k !== "passwordHash" && (isCreate || JSON.stringify(before?.[k]) !== JSON.stringify(row[k])));
  await audit(actor.id, isCreate ? "create" : "update", r.key, rid, `${r.title({ ...before, ...row })}${isCreate ? "" : ` — changed: ${changed.join(", ") || "nothing"}`}`);
  return { ...row, id: rid };
}

export async function deleteRow(r: AdminResource, id: string, actor: { id: string }) {
  if (r.noDelete) throw new ApiError(405, "not_allowed", "These records cannot be deleted. Disable them instead.");
  const before = await delegate(r).findUnique({ where: { [idOf(r)]: id }, include: r.include });
  if (!before) throw new ApiError(404, "not_found", "Record not found.");
  await delegate(r).delete({ where: { [idOf(r)]: id } });
  await audit(actor.id, "delete", r.key, id, r.title(before));
}

/** Read a possibly nested column path such as "division.name". */
export function cell(r: AdminResource, row: Row, path: string): string {
  if (path === "@title") return r.title(row);
  if (path === "@fighter") {
    const f = row.fighter as { firstName: string; lastName: string } | null;
    return f ? `${f.firstName} ${f.lastName}` : "—";
  }
  let v: unknown = row;
  for (const p of path.split(".")) v = (v as Row | null)?.[p];
  if (v == null || v === "") return "—";
  if (v instanceof Date) return v.toISOString().slice(0, 16).replace("T", " ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}
