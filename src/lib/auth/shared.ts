// Pieces shared by the auth pages, the callback route and the proxy.

// Signed-in areas. The proxy gates these; each page re-checks, and RLS is the
// real boundary underneath both.
export const PROTECTED_PREFIXES = ["/library", "/watch", "/admin"];

// Why a redemption failed, whether caught on the form or in /auth/callback.
export const redeemErrors: Record<string, string> = {
  "bad-code": "That access code isn't recognised. Check it with your instructor.",
  "wrong-domain": "That email isn't on this school's approved list. Use your school email address.",
  inactive: "This school's access isn't active right now. Your instructor can check the term dates.",
  "no-membership": "Your email isn't linked to a school yet. Enter the access code your instructor gave you.",
};

// Only same-site paths, so ?next= cannot bounce someone to another domain.
export function safeNext(raw: unknown, fallback = "/library") {
  const next = typeof raw === "string" ? raw : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}
