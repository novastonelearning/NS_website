// Two throwaway schools for the end-to-end isolation test in the build plan.
//   npm run db:seed-test    creates them (safe to re-run)
//   npm run db:clean-test   removes them, their films and their test logins
//
// Everything created here is marked TEST so it cannot be mistaken for real data.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || key.startsWith("paste-")) {
  console.error("\n  .env.local needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.\n");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const schools = [
  { name: "Test School A", short_name: "School A", slug: "test-school-a", access_code: "TEST-A-7K2P", domain: "storychatpro.com", films: 3 },
  { name: "Test School B", short_name: "School B", slug: "test-school-b", access_code: "TEST-B-9M4X", domain: "gmail.com", films: 10 },
];

const must = ({ data, error }, what) => {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
};

async function seed() {
  const films = must(
    await db
      .from("films")
      .upsert(
        Array.from({ length: 10 }, (_, i) => ({
          slug: `test-film-${i + 1}`,
          title: `[TEST] Film ${i + 1}`,
          runtime_min: 12,
          sort_order: 1000 + i,
          is_published: true,
        })),
        { onConflict: "slug" },
      )
      .select("id, sort_order"),
    "films",
  ).sort((a, b) => a.sort_order - b.sort_order);

  for (const s of schools) {
    const [inst] = must(
      await db
        .from("institutions")
        .upsert({ name: s.name, short_name: s.short_name, slug: s.slug, access_code: s.access_code, status: "active" }, { onConflict: "slug" })
        .select("id"),
      s.name,
    );
    must(await db.from("institution_domains").upsert({ institution_id: inst.id, domain: s.domain }, { onConflict: "domain" }), "domain");
    must(await db.from("entitlements").delete().eq("institution_id", inst.id), "entitlements reset");
    must(
      await db.from("entitlements").insert(films.slice(0, s.films).map((f) => ({ institution_id: inst.id, film_id: f.id }))),
      "entitlements",
    );
    console.log(`  ${s.name.padEnd(14)} code ${s.access_code}   @${s.domain.padEnd(22)} ${s.films} films   /${s.slug}`);
  }
}

async function clean() {
  const insts = must(await db.from("institutions").select("id").in("slug", schools.map((s) => s.slug)), "find schools");
  const ids = insts.map((i) => i.id);
  if (ids.length) {
    const members = must(await db.from("users").select("id, email").in("institution_id", ids), "find members");
    for (const m of members) {
      must(await db.auth.admin.deleteUser(m.id), `login ${m.email}`);
      console.log(`  removed test login ${m.email}`);
    }
    must(await db.from("institutions").delete().in("id", ids), "schools");
  }
  must(await db.from("films").delete().like("slug", "test-film-%"), "films");
  console.log("  removed Test School A, Test School B and the ten [TEST] films");
}

const cleaning = process.argv.includes("--clean");
console.log(cleaning ? "\nRemoving test data…\n" : "\nSeeding test schools…\n");
await (cleaning ? clean() : seed());
console.log("\nDone.\n");
