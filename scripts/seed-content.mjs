// Loads the reviewed chat content from content/ into Supabase.
//   npm run db:seed-content              every film
//   npm run db:seed-content clever-minds one film
//
// Safe to re-run after editing any .md file: films, characters and prompts are
// upserted by slug. Characters removed from a film's cast are not deleted here
// (their conversations would go with them); remove those by hand if intended.
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || key.startsWith("paste-")) {
  console.error("\n  .env.local needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.\n");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const CONTENT = join(import.meta.dirname, "..", "content");

const must = ({ data, error }, what) => {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
};

// The frontmatter in content/ is flat `key: value`, where values are JSON
// (strings, arrays, numbers, booleans) or bare words such as `he/him`.
export function parseDoc(path) {
  const raw = readFileSync(path, "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw.trim() };
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!kv) continue;
    try { meta[kv[1]] = JSON.parse(kv[2]); } catch { meta[kv[1]] = kv[2]; }
  }
  return { meta, body: m[2].trim() };
}

// HTML comments in content are notes for editors, never for the model.
const stripNotes = (s) => s.replace(/<!--[\s\S]*?-->\n?/g, "").trim();

async function seedTemplates() {
  const shared = join(CONTENT, "shared");
  const rows = [
    ["character-rules", "character-rules.md"],
    ["moral-coach", "moral-coach.md"],
    ["moral-framework", "moral-framework.md"],
    ["character-education-framework", "character-education-framework.md"],
  ].map(([key, file]) => ({ key, body: stripNotes(parseDoc(join(shared, file)).body), updated_at: new Date().toISOString() }));
  must(await db.from("prompt_templates").upsert(rows, { onConflict: "key" }), "prompt_templates");
  console.log(`  shared templates: ${rows.map((r) => r.key).join(", ")}`);
}

async function seedFilm(slug) {
  const dir = join(CONTENT, "films", slug);
  const { meta: film, body: filmBody } = parseDoc(join(dir, "film.md"));

  const [row] = must(
    await db
      .from("films")
      .upsert(
        {
          slug,
          title: film.title,
          logline: film.logline || null,
          trailer_vimeo_id: film.trailer_vimeo_id || null,
          sort_order: film.episode,
          is_published: film.published === true,
        },
        { onConflict: "slug" },
      )
      .select("id"),
    `film ${slug}`,
  );

  // The whole knowledge pack, one tagged document per source file.
  const kdir = join(dir, "knowledge");
  const docs = readdirSync(kdir).filter((f) => f.endsWith(".md")).sort().map((f) => {
    const { meta, body } = parseDoc(join(kdir, f));
    return `<document title=${JSON.stringify(meta.title ?? f)}>\n${body}\n</document>`;
  });
  const continuity = (filmBody.split(/^## Continuity notes.*$/m)[1] ?? "").trim();
  must(
    await db.from("film_prompts").upsert(
      {
        film_id: row.id,
        knowledge: docs.join("\n\n"),
        continuity_notes: continuity,
        coach_uses_chat_summaries: typeof film.coach_uses_chat_summaries === "boolean" ? film.coach_uses_chat_summaries : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "film_id" },
    ),
    `film_prompts ${slug}`,
  );

  const drafts = [];
  for (const [i, cslug] of (film.cast ?? []).entries()) {
    const path = join(dir, "characters", `${cslug}.md`);
    if (!existsSync(path)) throw new Error(`${slug}: cast lists ${cslug} but ${path} is missing`);
    const { meta: c, body } = parseDoc(path);
    if (c.status !== "approved") drafts.push(cslug);
    const [char] = must(
      await db
        .from("characters")
        .upsert(
          {
            film_id: row.id,
            slug: cslug,
            name: c.name,
            role: c.role ?? "",
            pronouns: c.pronouns ?? "",
            portrait_url: c.portrait || null,
            intro: c.intro ?? "",
            opener: c.opener ?? "",
            suggested: c.suggested ?? [],
            sort_order: i,
          },
          { onConflict: "film_id,slug" },
        )
        .select("id"),
      `character ${cslug}`,
    );
    must(
      await db.from("character_prompts").upsert(
        {
          character_id: char.id,
          persona: stripNotes(body),
          aliases: c.aliases ?? [],
          avoid_actions: c.avoid_actions ?? "",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "character_id" },
      ),
      `character_prompts ${cslug}`,
    );
  }
  const words = docs.join(" ").split(/\s+/).length;
  console.log(`  ${film.title.padEnd(28)} ${String(film.cast?.length ?? 0).padStart(2)} characters, ${words.toLocaleString()} words of knowledge${drafts.length ? `  (draft: ${drafts.join(", ")})` : ""}`);
}

const only = process.argv[2];
const films = only ? [only] : readdirSync(join(CONTENT, "films")).filter((f) => existsSync(join(CONTENT, "films", f, "film.md")));
console.log("\nSeeding chat content…\n");
await seedTemplates();
for (const f of films) await seedFilm(f);
console.log("\nDone.\n");
