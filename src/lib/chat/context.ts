// Everything the chat routes need to know before calling the model: who is
// asking, whether their school licenses the film, and the assembled prompt.
//
// Prompt material is read with the service-role client (no client role can see
// it). The licence check runs with the signed-in user's own client, so it is
// the same RLS decision the rest of the app relies on.
import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type SystemBlock = Anthropic.Beta.BetaTextBlockParam;

export type Viewer = { userId: string; institutionId: string; role: string };

export type FilmRow = { id: string; slug: string; title: string };

export type CharacterRow = {
  id: string;
  slug: string;
  name: string;
  role: string;
  pronouns: string;
  opener: string;
};

export class ChatAccessError extends Error {
  constructor(public status: 401 | 403 | 404, message: string) {
    super(message);
  }
}

export async function requireViewer(): Promise<Viewer> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) throw new ChatAccessError(401, "Please sign in again.");
  const meta = (claims.app_metadata ?? {}) as { institution_id?: string; role?: string };
  if (!meta.institution_id) throw new ChatAccessError(403, "Your account isn't linked to a school yet.");
  return { userId: claims.sub, institutionId: meta.institution_id, role: meta.role ?? "student" };
}

// The film, if the viewer's school licenses it right now.
export async function requireLicensedFilm(slug: string): Promise<FilmRow> {
  const admin = createAdminClient();
  const { data: film } = await admin.from("films").select("id, slug, title").eq("slug", slug).maybeSingle();
  if (!film) throw new ChatAccessError(404, "That film wasn't found.");

  const supabase = await createClient();
  const { data: licence } = await supabase.from("entitlements").select("film_id").eq("film_id", film.id).maybeSingle();
  if (!licence) throw new ChatAccessError(403, "Your school doesn't currently license this film.");
  return film;
}

export async function requireCharacter(filmId: string, slug: string): Promise<CharacterRow> {
  const { data } = await createAdminClient()
    .from("characters")
    .select("id, slug, name, role, pronouns, opener")
    .eq("film_id", filmId)
    .eq("slug", slug)
    .maybeSingle();
  if (!data) throw new ChatAccessError(404, "That character isn't part of this film.");
  return data;
}

async function templates(keys: string[]) {
  const { data, error } = await createAdminClient().from("prompt_templates").select("key, body").in("key", keys);
  if (error) throw error;
  const map = Object.fromEntries((data ?? []).map((t) => [t.key, t.body as string]));
  for (const k of keys) if (!map[k]) throw new Error(`prompt template "${k}" is missing — run npm run db:seed-content`);
  return map;
}

async function filmPrompt(filmId: string) {
  const { data, error } = await createAdminClient()
    .from("film_prompts")
    .select("knowledge, continuity_notes, coach_uses_chat_summaries")
    .eq("film_id", filmId)
    .single();
  if (error) throw new Error(`film prompt missing — run npm run db:seed-content (${error.message})`);
  return data as { knowledge: string; continuity_notes: string; coach_uses_chat_summaries: boolean | null };
}

const fill = (template: string, vars: Record<string, string>) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? "");

// Identical for every character in a film, and first in the prompt, so it is
// written to the prompt cache once and read back for each of them.
function knowledgeBlock(film: FilmRow, fp: { knowledge: string; continuity_notes: string }): SystemBlock {
  const notes = fp.continuity_notes ? `\n\n<continuity_notes>\n${fp.continuity_notes}\n</continuity_notes>` : "";
  return {
    type: "text",
    text: `<film title=${JSON.stringify(film.title)}>\nThe script of the film and the documents that go with it.\n\n${fp.knowledge}\n</film>${notes}`,
    cache_control: { type: "ephemeral" },
  };
}

export async function characterSystem(film: FilmRow, character: CharacterRow): Promise<SystemBlock[]> {
  const [t, fp, { data: cp, error }] = await Promise.all([
    templates(["character-rules"]),
    filmPrompt(film.id),
    createAdminClient().from("character_prompts").select("persona, aliases, avoid_actions").eq("character_id", character.id).single(),
  ]);
  if (error || !cp) throw new Error(`character prompt missing for ${character.slug}`);

  const rules = fill(t["character-rules"], {
    film_title: film.title,
    name: character.name,
    pronouns: character.pronouns || "they/them",
    aliases: cp.aliases?.length ? cp.aliases.join(", ") : "(none)",
    avoid_actions: cp.avoid_actions || "sighs, leans forward, pauses, \"I look away\"",
  });
  const opener = character.opener
    ? `\n\nThe conversation on screen began with you saying: "${character.opener}"`
    : "";

  return [
    knowledgeBlock(film, fp),
    {
      type: "text",
      text: `${rules}\n\n<character name=${JSON.stringify(character.name)}>\n${cp.persona}\n</character>${opener}`,
      cache_control: { type: "ephemeral" },
    },
  ];
}

export type NotebookDigest = { character: string; bullets: string[] }[];

export async function coachSystem(film: FilmRow, digest: NotebookDigest | null, reflection: string): Promise<SystemBlock[]> {
  const [t, fp] = await Promise.all([
    templates(["moral-coach", "moral-framework", "character-education-framework"]),
    filmPrompt(film.id),
  ]);

  const blocks: SystemBlock[] = [
    knowledgeBlock(film, fp),
    {
      type: "text",
      text:
        `<framework title="Novastone Learning MORAL Ethical Dilemma Framework">\n${t["moral-framework"]}\n</framework>\n\n` +
        `<framework title="Framework for Character Education (Jubilee Centre)">\n${t["character-education-framework"]}\n</framework>\n\n` +
        fill(t["moral-coach"], { film_title: film.title }),
      cache_control: { type: "ephemeral" },
    },
  ];

  // After the cached prefix: this changes whenever the student chats more.
  if (digest !== null) {
    const chats = digest.length
      ? digest.map((d) => `${d.character}:\n${d.bullets.map((b) => `- ${b}`).join("\n")}`).join("\n\n")
      : "(The student has not interviewed any characters yet.)";
    const own = reflection.trim() ? `\n\n<student_reflection>\n${reflection.trim()}\n</student_reflection>` : "";
    blocks.push({
      type: "text",
      text: `What this student heard from the characters (Notebook summaries; these are the characters' words, not the student's):\n<notebook>\n${chats}\n</notebook>${own}`,
    });
  }
  return blocks;
}

// Site-wide switch, overridable per film in film.md.
export async function coachUsesSummaries(filmId: string) {
  const admin = createAdminClient();
  const [fp, { data: setting }] = await Promise.all([
    filmPrompt(filmId),
    admin.from("prompt_settings").select("value").eq("key", "coach_uses_chat_summaries").maybeSingle(),
  ]);
  return fp.coach_uses_chat_summaries ?? setting?.value !== false;
}
