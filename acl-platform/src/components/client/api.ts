export type ApiResult<T> = { data?: T; error?: { code: string; message: string; fields?: Record<string, string> } };

/** Browser-side API client. Redirects to sign-in on 401 so every engagement button doubles as a signup path. */
export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown; redirectOn401?: boolean } = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers: opts.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: "same-origin",
    });
    const json = (await res.json().catch(() => ({}))) as ApiResult<T>;
    if (res.status === 401 && opts.redirectOn401 !== false) {
      window.location.href = `/sign-in?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return { error: { code: "unauthenticated", message: "Sign in to continue." } };
    }
    if (!res.ok && !json.error) return { error: { code: "http", message: `Request failed (${res.status}).` } };
    return json;
  } catch {
    return { error: { code: "network", message: "Network problem. Check your connection and try again." } };
  }
}
