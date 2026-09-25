// Confirms the Supabase project is reachable, the migrations landed, and RLS
// is doing its job. Run: npm run db:check
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key || url.includes("your-project-ref")) {
  console.error(`
  .env.local is missing or still has placeholder values.

  Create .env.local in the project root with:

    NEXT_PUBLIC_SUPABASE_URL=https://<your-ref>.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon public key>

  Both are in your Supabase dashboard under Project Settings -> API.
`);
  process.exit(1);
}

const db = createClient(url, key);
let bad = 0;
const check = (name, pass, detail = "") => {
  console.log(`  ${pass ? "ok  " : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!pass) bad++;
};

console.log(`\nChecking ${url}\n`);

// 1. Reachable, and the schema exists.
const films = await db.from("films").select("id, title, is_published");
if (films.error) {
  check("films table reachable", false, films.error.message);
  console.error("\n  If this says the relation does not exist, run: npm run db:push\n");
  process.exit(1);
}
check("films table reachable", true, `${films.data.length} published row(s) visible`);

// 2. RLS is on, not merely configured. An anon key must not see these.
const sources = await db.from("film_sources").select("*");
check("film_sources denied to the anon key", sources.error !== null || sources.data.length === 0,
  sources.error ? sources.error.code ?? "denied" : `LEAKED ${sources.data.length} rows`);

const domains = await db.from("institution_domains").select("*");
check("institution_domains denied to the anon key", domains.error !== null || domains.data.length === 0,
  domains.error ? domains.error.code ?? "denied" : `LEAKED ${domains.data.length} rows`);

// 3. Signed out, entitlements must be empty — no institution in the JWT.
const ents = await db.from("entitlements").select("*");
check("entitlements empty when signed out", (ents.data?.length ?? 0) === 0,
  `${ents.data?.length ?? 0} rows`);

console.log(bad === 0
  ? "\nSupabase is wired up correctly.\n"
  : `\n${bad} check(s) failed — see above.\n`);
process.exit(bad === 0 ? 0 : 1);
