import { z } from "zod";
import { cookies } from "next/headers";
import { route, ApiError } from "@/server/api";
import { db } from "@/server/db";
import { CURRENCY_COOKIE } from "@/server/services/money";

const body = z.object({ code: z.string().length(3).nullable() });
export const POST = route({ body }, async ({ body }) => {
  const jar = await cookies();
  if (!body.code) jar.delete(CURRENCY_COOKIE);
  else {
    if (!(await db.currency.findUnique({ where: { code: body.code } }))) throw new ApiError(422, "validation", "Unsupported currency.");
    jar.set(CURRENCY_COOKIE, body.code, { path: "/", maxAge: 31536000, sameSite: "lax" });
  }
  return { ok: true };
});
