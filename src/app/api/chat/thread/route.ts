// GET /api/chat/thread?film=<slug>
// The student's MORAL Coach thread with message ids, read through RLS.
import { createClient } from "@/lib/supabase/server";
import { ChatAccessError, requireLicensedFilm, requireViewer } from "@/lib/chat/context";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("film");
  if (!slug) return Response.json({ error: "Invalid request." }, { status: 400 });
  try {
    const viewer = await requireViewer();
    const film = await requireLicensedFilm(slug);
    const supabase = await createClient();
    const { data } = await supabase
      .from("conversations")
      .select("messages(id, role, content)")
      .eq("user_id", viewer.userId)
      .eq("film_id", film.id)
      .eq("kind", "coach")
      .maybeSingle();
    const messages = [...(data?.messages ?? [])].sort((a, b) => a.id - b.id);
    return Response.json({ messages }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof ChatAccessError) return Response.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
