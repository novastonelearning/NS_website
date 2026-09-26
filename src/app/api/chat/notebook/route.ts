// POST /api/chat/notebook  { film, messageId }
// Saves one of the MORAL Coach's replies (normally the final report) to the
// student's Notebook. The message must belong to the student's own coach chat.
import { createAdminClient } from "@/lib/supabase/admin";
import { ChatAccessError, requireLicensedFilm, requireViewer } from "@/lib/chat/context";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { film?: unknown; messageId?: unknown };
  if (typeof body.film !== "string" || typeof body.messageId !== "number") {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    const viewer = await requireViewer();
    const film = await requireLicensedFilm(body.film);
    const admin = createAdminClient();

    const { data: msg } = await admin
      .from("messages")
      .select("content, role, conversations!inner(user_id, film_id, kind)")
      .eq("id", body.messageId)
      .eq("conversations.user_id", viewer.userId)
      .eq("conversations.film_id", film.id)
      .eq("conversations.kind", "coach")
      .maybeSingle();
    if (!msg || msg.role !== "assistant") return Response.json({ error: "That message can't be saved." }, { status: 404 });

    const { data: entry, error } = await admin
      .from("notebook_entries")
      .insert({
        user_id: viewer.userId,
        institution_id: viewer.institutionId,
        film_id: film.id,
        character_id: null,
        body: msg.content,
        through_message_id: body.messageId,
      })
      .select("id, character_id, bullets, body, created_at, auto_generated")
      .single();
    if (error) throw error;
    return Response.json({ entry });
  } catch (err) {
    if (err instanceof ChatAccessError) return Response.json({ error: err.message }, { status: err.status });
    console.error("save report failed", err);
    return Response.json({ error: "The report couldn't be saved. Please try again." }, { status: 500 });
  }
}
