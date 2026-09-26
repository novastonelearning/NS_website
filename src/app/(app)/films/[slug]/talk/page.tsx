import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import TalkToCharacters, { type CastMember, type NotebookEntry, type Thread } from "@/components/chat/TalkToCharacters";
import { ChatAccessError, coachUsesSummaries, requireLicensedFilm } from "@/lib/chat/context";
import { currentSchool } from "@/lib/school";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Talk to the characters | Novastone Learning" };

// Everything below is read with the student's own session, so RLS decides
// what they see: their school's licence, their own transcripts and notes.
export default async function TalkPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ panel?: string }>;
}) {
  const { slug } = await params;
  const { panel } = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect(`/login?next=/films/${slug}/talk`);

  let film;
  try {
    film = await requireLicensedFilm(slug);
  } catch (err) {
    if (err instanceof ChatAccessError) notFound();
    throw err;
  }

  const { data: cast } = await supabase
    .from("characters")
    .select("id, slug, name, role, intro, opener, suggested, portrait_url")
    .eq("film_id", film.id)
    .order("sort_order");
  // Licensed, but no characters written for it yet.
  if (!cast?.length) notFound();

  const [{ data: convos }, { data: entries }, { data: reflection }, summariesOn, school] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, character_id, kind, messages(id, role, content)")
      .eq("film_id", film.id)
      .eq("user_id", auth.claims.sub),
    supabase
      .from("notebook_entries")
      .select("id, character_id, bullets, body, created_at, auto_generated")
      .eq("film_id", film.id)
      .eq("user_id", auth.claims.sub)
      .order("created_at", { ascending: false }),
    supabase.from("reflections").select("body").eq("film_id", film.id).eq("user_id", auth.claims.sub).maybeSingle(),
    coachUsesSummaries(film.id),
    currentSchool(supabase),
  ]);

  const people: CastMember[] = (cast ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    role: c.role,
    intro: c.intro,
    opener: c.opener,
    suggested: (c.suggested as string[]) ?? [],
    portrait: c.portrait_url,
  }));

  const threads: Record<string, Thread> = {};
  for (const c of convos ?? []) {
    const key = c.kind === "coach" ? "coach" : (c.character_id as string);
    threads[key] = [...(c.messages ?? [])]
      .sort((a, b) => a.id - b.id)
      .map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content }));
  }

  return (
    <TalkToCharacters
      film={{ slug: film.slug, title: film.title }}
      school={school}
      cast={people}
      initialThreads={threads}
      initialNotebook={(entries ?? []) as NotebookEntry[]}
      initialReflection={reflection?.body ?? ""}
      coachSeesSummaries={summariesOn}
      startInCoach={panel === "coach"}
    />
  );
}
