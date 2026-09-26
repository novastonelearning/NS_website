// Resolves which institution a person belongs to, and records the answer in
// their JWT's app_metadata — the claim every RLS policy reads.
//
// Everything here runs with the service-role key, because institution_domains
// and other schools' institutions rows are deliberately unreadable to clients.
import { createAdminClient } from "@/lib/supabase/admin";

export type SelfSelectRole = "student" | "faculty";

export type Institution = { id: string; name: string; slug: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,62}$/;

export function normaliseEmail(raw: string) {
  const email = raw.trim().toLowerCase();
  return EMAIL_RE.test(email) ? email : null;
}

// Codes are stored upper-case; people type them however they like.
export function normaliseAccessCode(raw: string) {
  return raw.trim().toUpperCase();
}

// "jane@mail.lipscomb.edu" -> ["mail.lipscomb.edu", "lipscomb.edu"]. Stops
// before the bare TLD so a stray "edu" row could never match every school.
function domainCandidates(email: string) {
  const parts = email.split("@")[1].split(".");
  const out: string[] = [];
  for (let i = 0; i < parts.length - 1; i++) out.push(parts.slice(i).join("."));
  return out;
}

async function accessLive(institutionId: string) {
  const { data, error } = await createAdminClient().rpc("institution_access_live", { inst: institutionId });
  if (error) throw error;
  return data === true;
}

// The school an email address belongs to, matching the most specific
// approved domain. Null when no subscribing school claims the domain.
export async function institutionIdForEmail(email: string) {
  const { data, error } = await createAdminClient()
    .from("institution_domains")
    .select("institution_id, domain")
    .in("domain", domainCandidates(email));
  if (error) throw error;
  if (!data?.length) return null;
  data.sort((a, b) => b.domain.length - a.domain.length);
  return data[0].institution_id as string;
}

export async function institutionBySlug(slug: string): Promise<(Institution & { logo_url: string | null }) | null> {
  if (!SLUG_RE.test(slug)) return null;
  const { data, error } = await createAdminClient()
    .from("institutions")
    .select("id, name, slug, logo_url")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data || !(await accessLive(data.id))) return null;
  return data;
}

export type RedemptionCheck =
  | { ok: true; institution: Institution }
  | { ok: false; reason: "bad-code" | "wrong-domain" | "inactive" };

// The whole gate in one place: the code names a school, the email's domain
// must belong to that same school, and the school's term must be live.
// Called before sending a sign-in link, and again after the email is proven.
export async function checkRedemption(accessCode: string, email: string): Promise<RedemptionCheck> {
  const { data: inst, error } = await createAdminClient()
    .from("institutions")
    .select("id, name, slug")
    .eq("access_code", normaliseAccessCode(accessCode))
    .maybeSingle();
  if (error) throw error;
  if (!inst) return { ok: false, reason: "bad-code" };

  if ((await institutionIdForEmail(email)) !== inst.id) return { ok: false, reason: "wrong-domain" };
  if (!(await accessLive(inst.id))) return { ok: false, reason: "inactive" };
  return { ok: true, institution: inst };
}

// Writes the membership row and the JWT claims. The caller must refresh the
// session afterwards: the claims only reach RLS in the next issued token.
export async function bindUserToInstitution(user: { id: string; email: string }, institutionId: string, role: SelfSelectRole) {
  const admin = createAdminClient();

  // Admin is granted by hand, never self-selected — re-redeeming must not demote it.
  const { data: existing } = await admin.from("users").select("role").eq("id", user.id).maybeSingle();
  const finalRole = existing?.role === "admin" ? "admin" : role;

  const { error: rowError } = await admin
    .from("users")
    .upsert({ id: user.id, institution_id: institutionId, email: user.email, role: finalRole }, { onConflict: "id" });
  if (rowError) throw rowError;

  const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { institution_id: institutionId, role: finalRole },
  });
  if (authError) throw authError;
}
