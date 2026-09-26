// Proves tenant isolation against a real Postgres running in-process.
// Run: npm run verify:rls
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";

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
// Every migration, in filename order — the same order Supabase applies them.
for (const f of readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort()) {
  await db.exec(sql(`supabase/migrations/${f}`));
}
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

console.log("\nCharacter chat");
// Film 1 (licensed to Lipscomb and Cedar) and film 5 (Cedar only) each get a
// character. Jomo (Lipscomb) and Sam (Cedar) each chat with the film-1 character.
await db.exec(`
insert into characters (id, film_id, slug, name)
  select 'dddddddd-0000-0000-0000-000000000001', id, 'donna-summers', 'Donna Summers' from films where sort_order = 1;
insert into characters (id, film_id, slug, name)
  select 'dddddddd-0000-0000-0000-000000000005', id, 'film-five-char', 'Film Five' from films where sort_order = 5;
insert into character_prompts (character_id, persona) values ('dddddddd-0000-0000-0000-000000000001', 'secret persona');
insert into film_prompts (film_id, knowledge) select id, 'full script' from films where sort_order = 1;
insert into prompt_templates (key, body) values ('character-rules', 'rules');

insert into conversations (id, user_id, institution_id, film_id, character_id, kind)
  select 'eeeeeeee-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', id, 'dddddddd-0000-0000-0000-000000000001', 'character' from films where sort_order = 1;
insert into conversations (id, user_id, institution_id, film_id, character_id, kind)
  select 'eeeeeeee-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', id, 'dddddddd-0000-0000-0000-000000000001', 'character' from films where sort_order = 1;
insert into conversations (id, user_id, institution_id, film_id, kind)
  select 'eeeeeeee-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', id, 'coach' from films where sort_order = 1;
insert into messages (conversation_id, role, content) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'user', 'jomo asks'),
  ('eeeeeeee-0000-0000-0000-000000000001', 'assistant', 'donna answers jomo'),
  ('eeeeeeee-0000-0000-0000-000000000002', 'user', 'sam asks'),
  ('eeeeeeee-0000-0000-0000-000000000003', 'user', 'ada asks the coach');
insert into notebook_entries (user_id, institution_id, film_id, character_id, bullets)
  select 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', id, 'dddddddd-0000-0000-0000-000000000001', '["jomo note"]' from films where sort_order = 1;
insert into notebook_entries (user_id, institution_id, film_id, character_id, bullets)
  select 'bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', id, 'dddddddd-0000-0000-0000-000000000001', '["sam note"]' from films where sort_order = 1;
insert into reflections (user_id, film_id, institution_id, body)
  select 'bbbbbbbb-0000-0000-0000-000000000001', id, '22222222-2222-2222-2222-222222222222', 'sam reflects' from films where sort_order = 1;
`);

r = await asUser(lipscombStudent, "select slug from characters");
check("Lipscomb student sees only characters from licensed films", r.rows.length === 1 && r.rows[0].slug === "donna-summers", `${r.rows.length} rows`);
r = await asUser(cedarStudent, "select slug from characters");
check("Cedar student sees characters from both licensed films", r.rows.length === 2, `${r.rows.length} rows`);
r = await asUser(expiredStudent, "select slug from characters");
check("Expired school sees no characters", r.rows.length === 0, `${r.rows.length} rows`);
r = await asAnon("select slug from characters").catch(() => ({ rows: [] }));
check("Anonymous visitors see no characters", r.rows.length === 0, `${r.rows.length} rows`);

r = await asUser(lipscombStudent, "select content from messages");
check("Student reads only their own transcript", r.rows.length === 2 && r.rows.every((m) => m.content.includes("jomo")), r.rows.map((m) => m.content).join(", "));
r = await asUser(lipscombStudent, "select content from messages where conversation_id = 'eeeeeeee-0000-0000-0000-000000000002'");
check("Student cannot read another school's transcript by id", r.rows.length === 0, `${r.rows.length} rows`);
r = await asUser(lipscombFaculty, "select content from messages");
check("Faculty reads their school's transcripts (incl. coach), not Cedar's", r.rows.length === 3 && !r.rows.some((m) => m.content.includes("sam")), `${r.rows.length} rows`);
r = await asUser(cedarStudent, "select * from conversations");
check("Cedar student sees only their own conversation", r.rows.length === 1, `${r.rows.length} rows`);

r = await asUser(lipscombFaculty, "select bullets from notebook_entries");
check("Faculty sees Lipscomb notebook entries only", r.rows.length === 1 && JSON.stringify(r.rows[0].bullets).includes("jomo"), `${r.rows.length} rows`);
r = await asUser(lipscombFaculty, "select * from reflections");
check("Faculty cannot read Cedar's reflections", r.rows.length === 0, `${r.rows.length} rows`);

check("Student cannot write a message (server-only)", await denied(() =>
  asUser(lipscombStudent, "insert into messages (conversation_id, role, content) values ('eeeeeeee-0000-0000-0000-000000000001', 'assistant', 'forged')")));
check("Student cannot create a conversation (server-only)", await denied(() =>
  asUser(lipscombStudent, `insert into conversations (user_id, institution_id, film_id, kind)
    select 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', id, 'coach' from films where sort_order = 2`)));
check("Student cannot forge a notebook entry", await denied(() =>
  asUser(lipscombStudent, `insert into notebook_entries (user_id, institution_id, film_id)
    select 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', id from films where sort_order = 1`)));

await asUser(lipscombStudent, `insert into reflections (user_id, film_id, institution_id, body)
  select 'aaaaaaaa-0000-0000-0000-000000000001', id, '11111111-1111-1111-1111-111111111111', 'jomo reflects' from films where sort_order = 1`);
r = await asUser(lipscombStudent, "select body from reflections");
check("Student can save their own reflection", r.rows.length === 1 && r.rows[0].body === "jomo reflects");
check("Student cannot save a reflection for an unlicensed film", await denied(() =>
  asUser(lipscombStudent, `insert into reflections (user_id, film_id, institution_id, body)
    select 'aaaaaaaa-0000-0000-0000-000000000001', id, '11111111-1111-1111-1111-111111111111', 'x' from films where sort_order = 5`)));
check("Student cannot save a reflection under another school", await denied(() =>
  asUser(lipscombStudent, `insert into reflections (user_id, film_id, institution_id, body)
    select 'aaaaaaaa-0000-0000-0000-000000000001', id, '22222222-2222-2222-2222-222222222222', 'x' from films where sort_order = 2`)));

for (const t of ["character_prompts", "film_prompts", "prompt_templates", "prompt_settings"]) {
  check(`${t} unreadable by signed-in users`, await denied(() => asUser(cedarStudent, `select * from ${t}`)));
}

console.log("\nRoute-shadowing guard");
check("A slug that would shadow /films is rejected", await denied(() =>
  db.exec(`insert into institutions (name, slug, access_code) values ('Bad','films','X-1')`)));

check("A slug that would shadow /auth/callback is rejected", await denied(() =>
  db.exec(`insert into institutions (name, slug, access_code) values ('Bad','auth','X-2')`)));

r = await db.query("select count(*)::int as n from institutions where slug = 'lipscomb'");
check("A legitimate slug still inserts", r.rows[0].n === 1);

console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
