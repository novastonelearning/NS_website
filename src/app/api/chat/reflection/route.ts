// PUT /api/chat/reflection  { film, body }
// Written with the student's own session, so RLS enforces that it is their
// row, their school and a film their school licenses.
import { createClient } from "@/lib/supabase/server";
import { ChatAccessError, requireLicensedFilm, requireViewer } from "@/lib/chat/context";

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { film?: unknown; body?: unknown };
  if (typeof body.film !== "string" || typeof body.body !== "string" || body.body.length > 20000) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    const viewer = await requireViewer();
    const film = await requireLicensedFilm(body.film);
    const supabase = await createClient();
    const { error } = await supabase.from("reflections").upsert(
      {
        user_id: viewer.userId,
        film_id: film.id,
        institution_id: viewer.institutionId,
        body: body.body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,film_id" },
    );
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof ChatAccessError) return Response.json({ error: err.message }, { status: err.status });
    console.error("save reflection failed", err);
    return Response.json({ error: "Your reflection couldn't be saved." }, { status: 500 });
  }
}
