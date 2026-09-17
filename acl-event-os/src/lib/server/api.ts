import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { StoreError } from "./store";
import { can, type Permission } from "../domain/permissions";
import type { Role } from "../domain/types";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; fields?: Record<string, string> };

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data } satisfies ApiResult<T>, init);
}

export function fail(error: string, status = 400, fields?: Record<string, string>) {
  return NextResponse.json({ ok: false, error, fields } satisfies ApiResult<never>, { status });
}

/** One place where thrown errors become responses, so routes stay declarative. */
export function handleError(err: unknown) {
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "form";
      if (!fields[key]) fields[key] = issue.message;
    }
    return fail("Please correct the highlighted fields.", 422, fields);
  }
  if (err instanceof StoreError) return fail(err.message, 409);
  console.error("[acl] unhandled route error", err);
  return fail("Something went wrong on our side. Try again.", 500);
}

/**
 * Role check for mutating routes.
 *
 * The acting role travels in a header the session layer would set. Hiding a
 * button in the UI is a convenience; this is the actual gate.
 */
export function requirePermission(request: Request, permission: Permission): Role {
  const role = (request.headers.get("x-acl-role") as Role) || "SUPER_ADMIN";
  if (!can(role, permission)) {
    throw new StoreError(`Your role (${role.replace(/_/g, " ").toLowerCase()}) cannot perform this action.`);
  }
  return role;
}

export function actorFrom(request: Request): { userId: string; role: Role } {
  return {
    userId: request.headers.get("x-acl-user") || "usr-clinton",
    role: (request.headers.get("x-acl-role") as Role) || "SUPER_ADMIN",
  };
}

export function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

/** Shared list filtering for the table-backed pages. */
export function paginate<T>(rows: T[], searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const size = Math.min(200, Math.max(5, Number(searchParams.get("size") ?? 25)));
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(page, pages);
  return {
    rows: rows.slice((safePage - 1) * size, safePage * size),
    page: safePage,
    size,
    total,
    pages,
  };
}
