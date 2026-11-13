import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs only on signed-in areas (see `matcher`), so public pages stay static.
 * Refreshes the Supabase session cookie and bounces signed-out visitors away
 * from /admin and /account. Role and two-factor checks happen in
 * requireAdmin() and again in the database.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  if (!user && (pathname.startsWith("/admin") || pathname.startsWith("/account"))) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = "/auth/sign-in";
    signIn.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(signIn);
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/auth/:path*"],
};
