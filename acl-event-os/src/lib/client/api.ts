import type { Role } from "@/lib/domain/types";

export class ApiError extends Error {
  fields?: Record<string, string>;
  status: number;
  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

/** The acting session. A real deployment replaces this with a signed cookie. */
let session: { userId: string; role: Role } = { userId: "usr-clinton", role: "SUPER_ADMIN" };

export function setSession(next: { userId: string; role: Role }) {
  session = next;
}

export function getSession() {
  return session;
}

function headers(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-acl-user": session.userId,
    "x-acl-role": session.role,
  };
}

async function unwrap<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) {
    throw new ApiError(
      payload?.error ?? `Request failed (${response.status})`,
      response.status,
      payload?.fields,
    );
  }
  return payload.data as T;
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return unwrap<T>(await fetch(path, { headers: headers(), signal, cache: "no-store" }));
}

export async function apiSend<T>(
  path: string,
  body?: unknown,
  method: "POST" | "PATCH" | "DELETE" = "POST",
): Promise<T> {
  return unwrap<T>(
    await fetch(path, {
      method,
      headers: headers(),
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

/** Streams a CSV straight to the browser's downloads. */
export async function downloadCsv(path: string, filename: string) {
  const response = await fetch(path, { headers: headers() });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(payload?.error ?? "Export failed", response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
