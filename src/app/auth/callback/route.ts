import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { bindUserToInstitution, checkRedemption } from "@/lib/auth/institution";
import { safeNext } from "@/lib/auth/shared";
import { createClient } from "@/lib/supabase/server";

// The email link lands here. Verifying the token proves the person controls
// the email address — only now is the domain check worth anything.
//
// The link carries a token_hash (see the email templates in the Supabase
// dashboard), which verifies server-side in any browser. The PKCE `code` flow
// is still accepted, but only works when the link opens in the browser that
// asked for it — which email apps and phones routinely break.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const to = (path: string) => NextResponse.redirect(new URL(path, origin));

  const supabase = await createClient();
  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");

  const { data, error } = tokenHash
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: (searchParams.get("type") as EmailOtpType) ?? "email" })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : { data: { user: null }, error: new Error("no token_hash or code in link") };

  if (error || !data.user?.email) {
    console.error("[auth/callback] sign-in failed:", error?.message ?? "no user email");
    return to("/login?error=link");
  }
  const user = { id: data.user.id, email: data.user.email.toLowerCase() };

  // A redemption link carries the code and role it was requested with. Both
  // are re-checked here against the now-proven email, so editing the link
  // gains nothing.
  const redeemCode = searchParams.get("redeem");
  if (redeemCode) {
    const check = await checkRedemption(redeemCode, user.email);
    if (!check.ok) {
      await supabase.auth.signOut();
      return to(`/redeem?error=${check.reason}`);
    }
    await bindUserToInstitution(user, check.institution.id, searchParams.get("role") === "faculty" ? "faculty" : "student");
    // Re-issue the JWT so institution_id and role are in the token RLS reads.
    await supabase.auth.refreshSession();
    return to(next);
  }

  // Returning login: they must already belong to a school.
  if (!data.user.app_metadata?.institution_id) {
    await supabase.auth.signOut();
    return to("/redeem?error=no-membership");
  }
  return to(next);
}
