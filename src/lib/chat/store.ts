// Chat rows are written only here, with the service-role client, after the
// route has confirmed who is asking and that their school licenses the film.
// Every read and write is scoped by that verified user id.
import { createAdminClient } from "@/lib/supabase/admin";
import type { FilmRow, NotebookDigest, Viewer } from "./context";
import { summarizeChat, type Turn } from "./model";

// Long enough for a thorough interview; stops a runaway script racking up cost.
export const MAX_MESSAGES_PER_CONVERSATION = 200;
export const MAX_MESSAGE_CHARS = 4000;

export async function getOrCreateConversation(viewer: Viewer, film: FilmRow, characterId: string | null) {
  const admin = createAdminClient();
  const find = () => {
    const q = admin.from("conversations").select("id").eq("user_id", viewer.userId).eq("film_id", film.id);
    return (characterId ? q.eq("character_id", characterId) : q.is("character_id", null)).maybeSingle();
  };
  const existing = await find();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data.id as string;

  const { data, error } = await admin
    .from("conversations")
    .insert({
      user_id: viewer.userId,
      institution_id: viewer.institutionId,
      film_id: film.id,
      character_id: characterId,
      kind: characterId ? "character" : "coach",
    })
    .select("id")
    .single();
  if (!error) return data.id as string;
  // Two tabs raced to start the same conversation; the other one won.
  const retry = await find();
  if (retry.data) return retry.data.id as string;
  throw error;
}

export async function loadTurns(conversationId: string): Promise<(Turn & { id: number })[]> {
  const { data, error } = await createAdminClient()
    .from("messages")
    .select("id, role, content")
    .eq("conversation_id", conversationId)
    .order("id");
  if (error) throw error;
  return (data ?? []) as (Turn & { id: number })[];
}

export async function appendMessage(conversationId: string, role: Turn["role"], content: string) {
  const { data, error } = await createAdminClient()
    .from("messages")
    .insert({ conversation_id: conversationId, role, content })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as number;
}

// The API needs strictly alternating turns starting with the user. A reply
// that failed mid-way can leave two user turns in a row; merge them.
export function toApiTurns(rows: Turn[]): Turn[] {
  const out: Turn[] = [];
  for (const r of rows) {
    const last = out.at(-1);
    if (last && last.role === r.role) last.content += `\n\n${r.content}`;
    else out.push({ role: r.role, content: r.content });
  }
  while (out[0]?.role === "assistant") out.shift();
  return out;
}

export async function summarizeInto(viewer: Viewer, film: FilmRow, character: { id: string; name: string }, auto: boolean) {
  const admin = createAdminClient();
  const { data: convo } = await admin
    .from("conversations")
    .select("id")
    .eq("user_id", viewer.userId)
    .eq("film_id", film.id)
    .eq("character_id", character.id)
    .maybeSingle();
  if (!convo) return null;
  const turns = await loadTurns(convo.id);
  if (!turns.some((t) => t.role === "user")) return null;

  const bullets = await summarizeChat(character.name, film.title, toApiTurns(turns));
  const { data, error } = await admin
    .from("notebook_entries")
    .insert({
      user_id: viewer.userId,
      institution_id: viewer.institutionId,
      film_id: film.id,
      character_id: character.id,
      bullets,
      through_message_id: turns.at(-1)!.id,
      auto_generated: auto,
    })
    .select("id, character_id, bullets, body, created_at, auto_generated")
    .single();
  if (error) throw error;
  return data;
}

// What the coach sees: every Notebook summary for this film, in cast order.
// Any chat that has moved on since its last summary is summarized first, so
// the coach never depends on the student remembering to press Summarize.
export async function notebookDigest(viewer: Viewer, film: FilmRow): Promise<NotebookDigest> {
  const admin = createAdminClient();
  const [{ data: cast }, { data: convos }, { data: entries }] = await Promise.all([
    admin.from("characters").select("id, name, sort_order").eq("film_id", film.id).order("sort_order"),
    admin.from("conversations").select("id, character_id").eq("user_id", viewer.userId).eq("film_id", film.id).eq("kind", "character"),
    admin
      .from("notebook_entries")
      .select("character_id, bullets, through_message_id, created_at")
      .eq("user_id", viewer.userId)
      .eq("film_id", film.id)
      .not("character_id", "is", null)
      .order("created_at"),
  ]);

  const stale: { id: string; name: string }[] = [];
  for (const c of convos ?? []) {
    const { data: last } = await admin
      .from("messages")
      .select("id")
      .eq("conversation_id", c.id)
      .eq("role", "user")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!last) continue;
    const covered = Math.max(0, ...(entries ?? []).filter((e) => e.character_id === c.character_id).map((e) => e.through_message_id ?? 0));
    if (last.id > covered) {
      const person = cast?.find((p) => p.id === c.character_id);
      if (person) stale.push(person);
    }
  }
  const fresh = await Promise.all(stale.map((p) => summarizeInto(viewer, film, p, true)));

  const all = [...(entries ?? []), ...fresh.filter((e) => e !== null)];
  return (cast ?? [])
    .map((p) => ({
      character: p.name,
      bullets: all.filter((e) => e.character_id === p.id).flatMap((e) => (e.bullets as string[]) ?? []),
    }))
    .filter((d) => d.bullets.length > 0);
}

export async function reflectionText(viewer: Viewer, film: FilmRow) {
  const { data } = await createAdminClient()
    .from("reflections")
    .select("body")
    .eq("user_id", viewer.userId)
    .eq("film_id", film.id)
    .maybeSingle();
  return (data?.body as string | undefined) ?? "";
}
