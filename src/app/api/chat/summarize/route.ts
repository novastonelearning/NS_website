// POST /api/chat/summarize  { film, character }
// Adds a Notebook entry summarizing the student's chat with one character.
import { ChatAccessError, requireCharacter, requireLicensedFilm, requireViewer } from "@/lib/chat/context";
import { summarizeInto } from "@/lib/chat/store";

export const maxDuration = 120;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { film?: unknown; character?: unknown };
  if (typeof body.film !== "string" || typeof body.character !== "string") {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    const viewer = await requireViewer();
    const film = await requireLicensedFilm(body.film);
    const character = await requireCharacter(film.id, body.character);
    const entry = await summarizeInto(viewer, film, character, false);
    if (!entry) return Response.json({ error: "Ask a question first, then summarize." }, { status: 400 });
    return Response.json({ entry });
  } catch (err) {
    if (err instanceof ChatAccessError) return Response.json({ error: err.message }, { status: err.status });
    console.error("summarize failed", err);
    return Response.json({ error: "The summary couldn't be written. Please try again." }, { status: 500 });
  }
}
