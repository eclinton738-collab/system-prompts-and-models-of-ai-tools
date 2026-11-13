import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { Prisma } from "@prisma/client";
import { getCurrentUser, type CurrentUser } from "./auth";
import { can, type Permission } from "./permissions";
import { rateLimit } from "./rate-limit";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: Record<string, string>) {
    super(message);
  }
}

export const ok = <T>(data: T, init?: ResponseInit) => NextResponse.json({ data }, init);

type Options<S extends ZodTypeAny | undefined, A extends boolean> = {
  /** Require a signed-in user. */
  auth?: A;
  /** Require a permission (implies auth). */
  permission?: Permission;
  /** Zod schema for the JSON body. */
  body?: S;
  /** Requests per minute per client for this route. */
  limit?: number;
};

type Ctx<S, A> = {
  req: NextRequest;
  params: Record<string, string>;
  user: A extends true ? CurrentUser : CurrentUser | null;
  body: S extends ZodTypeAny ? z.infer<S> : undefined;
};

function clientKey(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

/** CSRF defence: state-changing requests must originate from this site. */
function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") !== "cross-site";
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}

/**
 * Wraps every API route with: rate limiting, CSRF origin check, authentication,
 * permission check, body validation and a uniform `{ data } | { error }` envelope.
 */
export function route<S extends ZodTypeAny | undefined = undefined, A extends boolean = false>(
  opts: Options<S, A>,
  fn: (ctx: Ctx<S, A>) => Promise<Response | unknown>,
) {
  return async (req: NextRequest, segment: { params: Promise<Record<string, string>> }) => {
    try {
      const mutating = req.method !== "GET" && req.method !== "HEAD";
      const rl = rateLimit(`${clientKey(req)}:${req.method}:${req.nextUrl.pathname}`, opts.limit ?? (mutating ? 30 : 240), 60_000);
      if (!rl.ok) throw new ApiError(429, "rate_limited", `Too many requests. Try again in ${rl.retryAfter}s.`);
      if (mutating && !sameOrigin(req)) throw new ApiError(403, "bad_origin", "Cross-site request blocked.");

      const user = await getCurrentUser();
      if ((opts.auth || opts.permission) && !user) throw new ApiError(401, "unauthenticated", "Sign in to continue.");
      if (opts.permission && !can(user?.role, opts.permission)) throw new ApiError(403, "forbidden", "You do not have permission to do that.");

      let body: unknown = undefined;
      if (opts.body) {
        const raw = await req.json().catch(() => {
          throw new ApiError(400, "invalid_json", "Request body must be JSON.");
        });
        body = opts.body.parse(raw);
      }
      const result = await fn({ req, params: await segment.params, user: user as never, body: body as never });
      return result instanceof Response ? result : ok(result);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: { code: err.code, message: err.message, fields: err.fields } }, { status: err.status });
      }
      if (err instanceof ZodError) {
        const fields: Record<string, string> = {};
        for (const issue of err.issues) fields[issue.path.join(".")] ??= issue.message;
        return NextResponse.json({ error: { code: "validation", message: "Please check the highlighted fields.", fields } }, { status: 422 });
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") return NextResponse.json({ error: { code: "conflict", message: "That value is already in use." } }, { status: 409 });
        if (err.code === "P2025") return NextResponse.json({ error: { code: "not_found", message: "Record not found." } }, { status: 404 });
        if (err.code === "P2003") return NextResponse.json({ error: { code: "in_use", message: "This record is referenced by other data and cannot be removed." } }, { status: 409 });
      }
      console.error("[api]", req.method, req.nextUrl.pathname, err);
      return NextResponse.json({ error: { code: "internal", message: "Something went wrong on our side." } }, { status: 500 });
    }
  };
}

export function notFound(what = "Resource"): never {
  throw new ApiError(404, "not_found", `${what} not found.`);
}

export function pageParams(req: NextRequest, max = 50) {
  const sp = req.nextUrl.searchParams;
  const take = Math.min(Math.max(Number(sp.get("limit")) || 20, 1), max);
  const page = Math.max(Number(sp.get("page")) || 1, 1);
  return { take, skip: (page - 1) * take, page };
}
