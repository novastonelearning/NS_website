// The adversarial cross-tenant test from the build plan, against the real
// Supabase project rather than the in-process copy that verify:rls uses.
//   npm run db:seed-test        (once — creates the two test schools)
//   npm run db:verify-live
//
// Creates one throwaway login per test school, signs each in exactly as the
// app would, then has each try to read and write the other school's data
// straight through the Supabase client. Nothing is emailed. The probe logins
// are deleted at the end, pass or fail.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey || serviceKey.startsWith("paste-")) {
  console.error("\n  .env.local needs the Supabase URL, anon key and service_role key.\n");
  process.exit(1);
}
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, serviceKey, opts);

let failures = 0;
const check = (name, pass, detail = "") => {
  console.log(`${pass ? "  ok  " : "  FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
};

const probes = [
  { slug: "test-school-a", email: "rls-probe-a@storychatpro.com", films: 3 },
  { slug: "test-school-b", email: "rls-probe-b@gmail.com", films: 10 },
];

async function signIn(probe) {
  const { data: inst } = await admin.from("institutions").select("id").eq("slug", probe.slug).single();
  if (!inst) throw new Error(`${probe.slug} is missing — run npm run db:seed-test first`);

  const { data: created, error } = await admin.auth.admin.createUser({
    email: probe.email,
    email_confirm: true,
    app_metadata: { institution_id: inst.id, role: "student" },
  });
  if (error) throw new Error(`create ${probe.email}: ${error.message}`);
  await admin.from("users").insert({ id: created.user.id, institution_id: inst.id, email: probe.email, role: "student" });

  // The same one-time token an email link carries, verified the way /auth/callback does.
  const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email: probe.email });
  const client = createClient(url, anonKey, opts);
  const { error: otpError } = await client.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "email" });
  if (otpError) throw new Error(`sign in ${probe.email}: ${otpError.message}`);

  return { ...probe, client, userId: created.user.id, institutionId: inst.id };
}

async function cleanUp() {
  const { data } = await admin.auth.admin.listUsers();
  for (const u of data?.users ?? []) {
    if (probes.some((p) => p.email === u.email)) await admin.auth.admin.deleteUser(u.id);
  }
}

await cleanUp(); // in case an earlier run was interrupted
try {
  const [a, b] = [await signIn(probes[0]), await signIn(probes[1])];

  for (const [me, them] of [[a, b], [b, a]]) {
    const label = me === a ? "School A" : "School B";
    const other = me === a ? "School B" : "School A";
    console.log(`\nSigned in as ${label}`);

    let r = await me.client.from("entitlements").select("institution_id, film_id");
    check(`Sees exactly its own ${me.films} licensed films`, r.data?.length === me.films && r.data.every((e) => e.institution_id === me.institutionId), `${r.data?.length} rows`);

    r = await me.client.from("entitlements").select("film_id").eq("institution_id", them.institutionId);
    check(`Asking for ${other}'s licences directly returns nothing`, r.data?.length === 0, `${r.data?.length} rows`);

    r = await me.client.from("institutions").select("id, access_code");
    check("Sees only its own school record", r.data?.length === 1 && r.data[0].id === me.institutionId, `${r.data?.length} rows`);

    r = await me.client.from("institutions").select("access_code").eq("id", them.institutionId);
    check(`Cannot read ${other}'s access code`, r.data?.length === 0, `${r.data?.length} rows`);

    r = await me.client.from("users").select("email");
    check("Sees only itself in the member list", r.data?.length === 1 && r.data[0].email === me.email, `${r.data?.length} rows`);

    r = await me.client.from("institution_domains").select("domain");
    check("Approved-domains list is refused", !!r.error || r.data?.length === 0, r.error?.code ?? `${r.data?.length} rows`);

    r = await me.client.from("film_sources").select("playback_id");
    check("Full-film playback IDs are refused", !!r.error || r.data?.length === 0, r.error?.code ?? `${r.data?.length} rows`);

    const { data: film } = await admin.from("films").select("id").eq("slug", "test-film-10").single();
    r = await me.client.from("entitlements").insert({ institution_id: me.institutionId, film_id: film.id });
    check("Cannot grant its own school an extra film", !!r.error, r.error?.code ?? "insert succeeded");

    r = await me.client.from("view_events").insert({ user_id: me.userId, institution_id: them.institutionId, film_id: film.id });
    check(`Cannot log a viewing against ${other}`, !!r.error, r.error?.code ?? "insert succeeded");

    // Character chat: seed one transcript for "them", then try to reach it.
    const { data: theirFilm } = await admin.from("films").select("id").eq("slug", "test-film-1").single();
    const { data: convo } = await admin
      .from("conversations")
      .insert({ user_id: them.userId, institution_id: them.institutionId, film_id: theirFilm.id, kind: "coach" })
      .select("id")
      .single();
    await admin.from("messages").insert({ conversation_id: convo.id, role: "user", content: `${other} private answer` });
    await admin.from("notebook_entries").insert({ user_id: them.userId, institution_id: them.institutionId, film_id: theirFilm.id, body: "private report" });

    r = await me.client.from("messages").select("content").eq("conversation_id", convo.id);
    check(`Cannot read ${other}'s coach transcript by id`, r.data?.length === 0, `${r.data?.length} rows`);
    r = await me.client.from("notebook_entries").select("body");
    check(`Cannot read ${other}'s Notebook`, r.data?.length === 0, `${r.data?.length} rows`);
    r = await me.client.from("messages").insert({ conversation_id: convo.id, role: "assistant", content: "forged" });
    check("Cannot write chat messages directly", !!r.error, r.error?.code ?? "insert succeeded");
    for (const t of ["character_prompts", "film_prompts", "prompt_templates"]) {
      r = await me.client.from(t).select("*").limit(1);
      check(`${t} is refused`, !!r.error || r.data?.length === 0, r.error?.code ?? `${r.data?.length} rows`);
    }
    await admin.from("conversations").delete().eq("id", convo.id);
    await admin.from("notebook_entries").delete().eq("user_id", them.userId);

    // app_metadata is server-only: a client can only ever change user_metadata.
    await me.client.auth.updateUser({ data: { institution_id: them.institutionId, role: "admin" } });
    await me.client.auth.refreshSession();
    r = await me.client.from("entitlements").select("institution_id");
    check("Editing its own profile cannot switch school", r.data?.every((e) => e.institution_id === me.institutionId) && r.data?.length === me.films, `${r.data?.length} rows`);
  }
} finally {
  await cleanUp();
  console.log("\nProbe logins removed.");
}

console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
