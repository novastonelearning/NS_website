// Proves tenant isolation against a real Postgres running in-process.
// Run: npm run verify:rls
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const db = new PGlite();
const sql = (p) => readFileSync(p, "utf8");

let failures = 0;
const check = (name, pass, detail = "") => {
  console.log(`${pass ? "  ok  " : "  FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
};

// Runs a query as a signed-in member of an institution, exactly as PostgREST would.
async function asUser({ sub, institution_id, role = "student" }, query) {
  const claims = JSON.stringify({ sub, app_metadata: { institution_id, role } });
  await db.exec(`select set_config('request.jwt.claims', $claims$${claims}$claims$, false);`);
  await db.exec("set role authenticated;");
  try {
    return await db.query(query);
  } finally {
    await db.exec("reset role;");
  }
}

async function asAnon(query) {
  await db.exec("select set_config('request.jwt.claims', '{}', false);");
  await db.exec("set role anon;");
  try {
    return await db.query(query);
  } finally {
    await db.exec("reset role;");
  }
}

const denied = async (fn) => {
  try { await fn(); return false; } catch { return true; }
};

console.log("\nApplying shim + migrations…");
await db.exec(sql("scripts/supabase-shim.sql"));
await db.exec(sql("supabase/migrations/20260925120000_init_schema.sql"));
await db.exec(sql("supabase/migrations/20260925120100_rls_policies.sql"));
console.log("Migrations applied cleanly.\n");

// ---- seed -------------------------------------------------------------
await db.exec(`
insert into films (slug, title, sort_order, is_published)
select 'film-' || i, 'Film ' || i, i, true from generate_series(1,10) i;

insert into film_sources (film_id, provider, playback_id)
select id, 'mux', 'pb_' || slug from films;

insert into institutions (id, name, slug, access_code, status, term_end) values
  ('11111111-1111-1111-1111-111111111111','Lipscomb University','lipscomb','LIPSCOMB-7K42','active', current_date + 300),
  ('22222222-2222-2222-2222-222222222222','Cedar Valley College','cedar-valley','CEDAR-9X10','active', current_date + 300),
  ('33333333-3333-3333-3333-333333333333','Harborview State','harborview','HARBOR-0001','active', current_date - 1);

insert into institution_domains (institution_id, domain) values
  ('11111111-1111-1111-1111-111111111111','lipscomb.edu'),
  ('22222222-2222-2222-2222-222222222222','cedarvalley.edu');

-- Lipscomb bought 3 of 10; Cedar bought all 10; Harborview 5 but its term ended.
insert into entitlements (institution_id, film_id)
  select '11111111-1111-1111-1111-111111111111', id from films where sort_order <= 3;
insert into entitlements (institution_id, film_id)
  select '22222222-2222-2222-2222-222222222222', id from films;
insert into entitlements (institution_id, film_id)
  select '33333333-3333-3333-3333-333333333333', id from films where sort_order <= 5;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001','jomo@lipscomb.edu'),
  ('aaaaaaaa-0000-0000-0000-000000000002','prof@lipscomb.edu'),
  ('bbbbbbbb-0000-0000-0000-000000000001','sam@cedarvalley.edu'),
  ('cccccccc-0000-0000-0000-000000000001','old@harborview.edu');

insert into users (id, institution_id, email, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','jomo@lipscomb.edu','student'),
  ('aaaaaaaa-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','prof@lipscomb.edu','faculty'),
  ('bbbbbbbb-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','sam@cedarvalley.edu','student'),
  ('cccccccc-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','old@harborview.edu','student');

insert into view_events (user_id, institution_id, film_id, seconds_watched)
  select 'aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111', id, 120
  from films where sort_order = 1;
insert into view_events (user_id, institution_id, film_id, seconds_watched)
  select 'bbbbbbbb-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222', id, 300
  from films where sort_order = 1;
`);

// A second Lipscomb viewer, so "faculty sees the institution's history" is
// distinguishable from "faculty sees only their own" — with one event both are 1.
await db.exec(`
insert into auth.users (id, email) values ('aaaaaaaa-0000-0000-0000-000000000003','ada@lipscomb.edu');
insert into users (id, institution_id, email, role) values
  ('aaaaaaaa-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','ada@lipscomb.edu','student');
insert into view_events (user_id, institution_id, film_id, seconds_watched)
  select 'aaaaaaaa-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111', id, 45
  from films where sort_order = 2;
`);

const lipscombStudent = { sub: "aaaaaaaa-0000-0000-0000-000000000001", institution_id: "11111111-1111-1111-1111-111111111111" };
const lipscombFaculty = { sub: "aaaaaaaa-0000-0000-0000-000000000002", institution_id: "11111111-1111-1111-1111-111111111111", role: "faculty" };
const cedarStudent    = { sub: "bbbbbbbb-0000-0000-0000-000000000001", institution_id: "22222222-2222-2222-2222-222222222222" };
const expiredStudent  = { sub: "cccccccc-0000-0000-0000-000000000001", institution_id: "33333333-3333-3333-3333-333333333333" };

console.log("Tenant isolation");
let r = await asUser(lipscombStudent, "select * from entitlements");
check("Lipscomb student sees only their 3 films", r.rows.length === 3, `${r.rows.length} rows`);

r = await asUser(cedarStudent, "select * from entitlements");
check("Cedar student sees all 10", r.rows.length === 10, `${r.rows.length} rows`);

r = await asUser(lipscombStudent, "select * from entitlements where institution_id = '22222222-2222-2222-2222-222222222222'");
check("Lipscomb student cannot read Cedar's entitlements", r.rows.length === 0, `${r.rows.length} rows`);

r = await asUser(lipscombStudent, "select * from institutions");
check("Student sees only their own institution row", r.rows.length === 1 && r.rows[0].slug === "lipscomb");

console.log("\nTerm expiry");
r = await asUser(expiredStudent, "select * from entitlements");
check("Expired term revokes access with no job to run", r.rows.length === 0, `${r.rows.length} rows`);

console.log("\nPublic catalogue");
r = await asAnon("select * from films");
check("Anonymous visitor sees all 10 published films", r.rows.length === 10, `${r.rows.length} rows`);

console.log("\nServer-only tables");
check("Playback IDs unreadable by signed-in users",
  await denied(() => asUser(lipscombStudent, "select * from film_sources")));
check("Domain table unreadable by signed-in users",
  await denied(() => asUser(lipscombStudent, "select * from institution_domains")));
check("Playback IDs unreadable by anonymous visitors",
  await denied(() => asAnon("select * from film_sources")));

console.log("\nViewing history");
r = await asUser(lipscombStudent, "select * from view_events");
check("Student sees only their own history", r.rows.length === 1, `${r.rows.length} rows`);

r = await asUser(lipscombFaculty, "select * from view_events");
check("Faculty sees both Lipscomb viewers, not Cedar's", r.rows.length === 2, `${r.rows.length} rows`);

check("Student cannot forge an event for another user", await denied(() =>
  asUser(lipscombStudent, `insert into view_events (user_id, institution_id, film_id)
    select 'bbbbbbbb-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222', id from films limit 1`)));

console.log("\nRoute-shadowing guard");
check("A slug that would shadow /films is rejected", await denied(() =>
  db.exec(`insert into institutions (name, slug, access_code) values ('Bad','films','X-1')`)));

r = await db.query("select count(*)::int as n from institutions where slug = 'lipscomb'");
check("A legitimate slug still inserts", r.rows[0].n === 1);

console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
