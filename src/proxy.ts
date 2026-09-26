import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PROTECTED_PREFIXES } from "@/lib/auth/shared";

// Next 16 renamed middleware.ts to proxy.ts. Two jobs: keep the Supabase
// session cookie fresh on every request, and turn away signed-out visitors
// from the app routes. This is an optimistic check — pages verify again, and
// RLS is the boundary that actually holds.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getClaims() verifies the JWT; getSession() would trust the cookie as-is.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const path = request.nextUrl.pathname;

  if (!PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return response;

  const redirectTo = (target: string) => {
    const url = request.nextUrl.clone();
    url.pathname = target;
    url.search = target === "/login" ? `?next=${encodeURIComponent(path)}` : "";
    const res = NextResponse.redirect(url);
    // Carry any refreshed session cookies across the redirect.
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (!claims) return redirectTo("/login");
  const meta = (claims.app_metadata ?? {}) as { institution_id?: string; role?: string };
  if (!meta.institution_id) return redirectTo("/redeem");
  if (path.startsWith("/admin") && meta.role !== "admin") return redirectTo("/library");

  return response;
}

export const config = {
  // Everything except static assets and image optimisation.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)"],
};
