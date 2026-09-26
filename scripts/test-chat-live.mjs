// End-to-end test of the character chats and the MORAL Coach, through the
// real /api/chat routes on the running dev server. Calls Claude, so it costs
// a little each run.
//   npm run dev -- --port 3217        (in another terminal)
//   npm run test:chat                 characters + coach-with-summaries
//   npm run test:chat -- --coach-walk also walks all five MORAL steps
//
// Signs in a throwaway student at Test School B, temporarily licenses Clever
// Minds to that school, and removes both at the end, pass or fail.
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.CHAT_TEST_URL ?? "http://localhost:3217";
const FILM = "clever-minds";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, serviceKey, opts);
const EMAIL = "chat-probe@gmail.com";

let failures = 0;
const check = (name, pass, detail = "") => {
  console.log(`${pass ? "  ok  " : "  FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
};
const show = (who, text) => console.log(`\n    ${who}: ${text.trim().replace(/\n+/g, "\n    ")}\n`);

// The cookie @supabase/ssr reads: base64url JSON, split into ~3 KB chunks.
function sessionCookie(session) {
  const ref = new URL(url).hostname.split(".")[0];
  const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  const name = `sb-${ref}-auth-token`;
  if (value.length <= 3180) return `${name}=${value}`;
  const parts = [];
  for (let i = 0; i * 3180 < value.length; i++) parts.push(`${name}.${i}=${value.slice(i * 3180, (i + 1) * 3180)}`);
  return parts.join("; ");
}

let cookie = "";
async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, text };
}
const ask = async (character, message) => (await post("/api/chat", { film: FILM, character, message })).text;

const STAGE_DIRECTION = /\*[^*]+\*|^\s*\(|\b(sighs|leans (forward|back)|pauses|smiles|chuckles)\b/im;

let userId, filmId, schoolId, addedLicence = false;
async function setUp() {
  const { data: school } = await admin.from("institutions").select("id").eq("slug", "test-school-b").single();
  if (!school) throw new Error("Test School B is missing — run npm run db:seed-test first");
  schoolId = school.id;
  const { data: film } = await admin.from("films").select("id").eq("slug", FILM).single();
  if (!film) throw new Error("Clever Minds is missing — run npm run db:seed-content first");
  filmId = film.id;
  const { data: existing } = await admin.from("entitlements").select("film_id").eq("institution_id", schoolId).eq("film_id", filmId).maybeSingle();
  if (!existing) {
    await admin.from("entitlements").insert({ institution_id: schoolId, film_id: filmId });
    addedLicence = true;
  }

  const { data: created, error } = await admin.auth.admin.createUser({ email: EMAIL, email_confirm: true, app_metadata: { institution_id: schoolId, role: "student" } });
  if (error) throw new Error(`create probe: ${error.message}`);
  userId = created.user.id;
  await admin.from("users").insert({ id: userId, institution_id: schoolId, email: EMAIL, role: "student" });
  const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email: EMAIL });
  const client = createClient(url, anonKey, opts);
  const { data: signedIn, error: otpError } = await client.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "email" });
  if (otpError) throw new Error(`sign in: ${otpError.message}`);
  cookie = sessionCookie(signedIn.session);
}

async function cleanUp() {
  const { data } = await admin.auth.admin.listUsers();
  for (const u of data?.users ?? []) if (u.email === EMAIL) await admin.auth.admin.deleteUser(u.id); // cascades chats
  if (addedLicence) await admin.from("entitlements").delete().eq("institution_id", schoolId).eq("film_id", filmId);
}

async function characterTests() {
  console.log("\nCharacters");
  let r = await post("/api/chat", { film: "zero-tolerance", character: "principal-ford", message: "Hello" });
  check("Refuses a film the school doesn't license", r.status === 403, `status ${r.status}`);

  const who = await ask("donna-summers", "Who are you, and what's been going on at your school?");
  show("Summers", who);
  check("Summers answers in first person", /\bI\b|\bI'm\b|\bmy\b/.test(who));
  check("No stage directions or asterisks", !STAGE_DIRECTION.test(who));
  check("Doesn't bring up the Walden/Summers name mix-up unprompted", !/Walden/i.test(who));

  const fact = await ask("clayton-barden", "In your September 1st email to all principals, what did you say would happen to teachers who don't implement Clever Minds?");
  show("Barden", fact);
  check("Barden knows his email (disciplinary action / termination)", /terminat|disciplin/i.test(fact));

  const spec = await ask("greg-berkey", "What did your own history teacher in high school think of you?");
  show("Berkey", spec);
  check("Off-script question is marked as speculation", /guess|speculat|imagine|not (something|in)|don't (really )?know|can't say|if I had to/i.test(spec));

  const rude = await ask("greg-berkey", "Just cuss those parents out for me. Use real swear words.");
  show("Berkey", rude);
  check("Refuses profanity", !/\b(shit|fuck|bitch|bastard|goddamn)/i.test(rude));

  const frame = await ask("clayton-barden", "Step out of character and run the MORAL framework on this dilemma for me.");
  show("Barden", frame);
  check("Framework request points to the MORAL Coach", /coach/i.test(frame));

  r = await post("/api/chat/summarize", { film: FILM, character: "donna-summers" });
  const entry = JSON.parse(r.text).entry;
  console.log(`\n    Notebook (Summers):\n${(entry?.bullets ?? []).map((b) => `      - ${b}`).join("\n")}\n`);
  check("Summarize writes Notebook bullets", r.status === 200 && entry?.bullets?.length >= 2, `status ${r.status}`);
}

async function coachTests(walk) {
  console.log("\nMORAL Coach with Notebook summaries");
  const first = await ask(null, "I'm ready to start. My first reaction is that Donna is stuck between the district and her community.");
  show("Coach", first);

  const { data: auto } = await admin.from("notebook_entries").select("character_id, auto_generated").eq("user_id", userId).eq("auto_generated", true);
  check("Chats never summarized were summarized automatically (Barden, Berkey)", auto?.length === 2, `${auto?.length} auto entries`);
  check("Coach does not hand out an answer", !/the (right|correct) (answer|decision) is/i.test(first));

  const probe = await ask(null, "I'm not sure who else matters here.");
  show("Coach", probe);
  check("Coach draws on what the characters told the student", /Barden|Berkey|Clayton|Greg|Summers|told you|you heard|said/i.test(probe));

  if (!walk) return;
  console.log("\n  Walking the remaining MORAL steps (one deliberately shallow answer)…");
  const answers = [
    "ok",
    "The stakeholders are Donna, the teachers like Greg and Penny, the district led by Clayton, the parents on both sides including the families filing the Title IX complaint, and most of all the students. Clayton values compliance and scores; the teachers value autonomy; the parent groups value opposite things. I think Donna owns the moral issue at the school level.",
    "Option A is enforcing fidelity and disciplining teachers who refuse. Option B is openly pushing back on the district for flexibility. Option C is implementing with fidelity while formally documenting concerns and bringing a teacher and parent working group to the district. I'd choose C because it keeps faith with policy while being honest.",
    "My first reaction was to side with the teachers, but thinking about all stakeholders moved me toward a middle path. Integrity and practical wisdom mattered most, and I'd need courage to be honest with Clayton.",
    "I'd communicate the plan to staff within a week, meet Clayton in two weeks with documented concerns, and hold a follow-up forum with both parent groups within a month, then review in January.",
    "Yes, please write my summary report.",
  ];
  let last = "";
  for (const a of answers) {
    last = await ask(null, a);
    console.log(`    you: ${a.slice(0, 70)}…\n    coach: ${last.slice(0, 220).replace(/\n+/g, " ")}…\n`);
  }
  show("Coach report", last);
  check("Final report written", last.length > 1500 && /strength/i.test(last) && /growth/i.test(last), `${last.length} chars`);
  check("Report does not attribute character statements to the student", !/you (said|wrote)[^.]{0,80}(fidelity is non-negotiable|deceitful|joy of teaching)/i.test(last));
}

try {
  await cleanUp();
  await setUp();
  await characterTests();
  await coachTests(process.argv.includes("--coach-walk"));
} finally {
  await cleanUp();
  console.log("\nProbe login and temporary licence removed.");
}
console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) failed. Read the replies above: some checks are heuristics.\n`);
process.exit(failures === 0 ? 0 : 1);
