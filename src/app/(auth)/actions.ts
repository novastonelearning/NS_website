"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkRedemption, normaliseEmail, type SelfSelectRole } from "@/lib/auth/institution";
import { redeemErrors, safeNext } from "@/lib/auth/shared";
import { createClient } from "@/lib/supabase/server";

// React 19 resets a form after its action runs, so an error carries back what
// was typed and the form re-fills itself from it.
type Values = { email?: string; code?: string; role?: string };
export type FormState =
  | { status: "idle" }
  | { status: "error"; message: string; values: Values }
  | { status: "sent"; email: string };

const typed = (form: FormData): Values => ({
  email: String(form.get("email") ?? ""),
  code: String(form.get("code") ?? ""),
  role: String(form.get("role") ?? ""),
});

async function callbackUrl(params: Record<string, string>) {
  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  return `${origin}/auth/callback?${new URLSearchParams(params)}`;
}

// Access code + school email. Everything is checked before a link is sent, and
// checked again in /auth/callback once the email has actually been proven.
export async function requestRedeemLink(_prev: FormState, form: FormData): Promise<FormState> {
  const email = normaliseEmail(String(form.get("email") ?? ""));
  const code = String(form.get("code") ?? "");
  const role: SelfSelectRole = form.get("role") === "faculty" ? "faculty" : "student";

  if (!email) return { status: "error", message: "Enter a valid email address.", values: typed(form) };
  if (!code.trim()) return { status: "error", message: "Enter your access code.", values: typed(form) };

  const check = await checkRedemption(code, email);
  if (!check.ok) return { status: "error", message: redeemErrors[check.reason], values: typed(form) };

  // The code and role ride in the link itself, not a cookie, so the email can
  // be opened in any browser or on another device. Tamper-proofing is not
  // needed: the callback re-validates the code against the proven email.
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: await callbackUrl({ next: "/library", redeem: code.trim(), role }),
      shouldCreateUser: true,
    },
  });
  if (error) return { status: "error", message: sendError(error.message), values: typed(form) };

  return { status: "sent", email };
}

// Returning users only. The reply is the same whether or not the account
// exists, so the form cannot be used to discover who has one.
export async function requestLoginLink(_prev: FormState, form: FormData): Promise<FormState> {
  const email = normaliseEmail(String(form.get("email") ?? ""));
  if (!email) return { status: "error", message: "Enter a valid email address.", values: typed(form) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: await callbackUrl({ next: safeNext(form.get("next")) }), shouldCreateUser: false },
  });
  if (error && /rate limit/i.test(error.message)) return { status: "error", message: sendError(error.message), values: typed(form) };

  return { status: "sent", email };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function sendError(message: string) {
  return /rate limit/i.test(message)
    ? "Too many sign-in emails in a short time. Wait a few minutes and try again."
    : "We couldn't send the sign-in email. Try again in a moment.";
}
