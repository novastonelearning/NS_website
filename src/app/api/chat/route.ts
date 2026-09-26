// POST /api/chat  { film, character | null, message }
// Streams the character's (or the MORAL Coach's) reply as plain text.
// `character: null` means the coach.
import {
  ChatAccessError,
  characterSystem,
  coachSystem,
  coachUsesSummaries,
  requireCharacter,
  requireLicensedFilm,
  requireViewer,
} from "@/lib/chat/context";
import { streamReply } from "@/lib/chat/model";
import {
  appendMessage,
  getOrCreateConversation,
  loadTurns,
  MAX_MESSAGE_CHARS,
  MAX_MESSAGES_PER_CONVERSATION,
  notebookDigest,
  reflectionText,
  toApiTurns,
} from "@/lib/chat/store";

export const maxDuration = 300;

export async function POST(request: Request) {
  let body: { film?: unknown; character?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (typeof body.film !== "string" || !message) return Response.json({ error: "Invalid request." }, { status: 400 });
  if (message.length > MAX_MESSAGE_CHARS) {
    return Response.json({ error: `Please keep messages under ${MAX_MESSAGE_CHARS.toLocaleString()} characters.` }, { status: 400 });
  }

  try {
    const viewer = await requireViewer();
    const film = await requireLicensedFilm(body.film);
    const character = typeof body.character === "string" ? await requireCharacter(film.id, body.character) : null;

    const conversationId = await getOrCreateConversation(viewer, film, character?.id ?? null);
    const history = await loadTurns(conversationId);
    if (history.length >= MAX_MESSAGES_PER_CONVERSATION) {
      return Response.json({ error: "This conversation has reached its length limit." }, { status: 429 });
    }

    const system = character
      ? await characterSystem(film, character)
      : await coachSystem(
          film,
          (await coachUsesSummaries(film.id)) ? await notebookDigest(viewer, film) : null,
          await reflectionText(viewer, film),
        );

    await appendMessage(conversationId, "user", message);
    const turns = toApiTurns([...history, { role: "user", content: message }]);
    const stream = streamReply(system, turns, character ? "character" : "coach");

    const encoder = new TextEncoder();
    const body_ = new ReadableStream<Uint8Array>({
      async start(controller) {
        let text = "";
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              text += event.delta.text;
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          const final = await stream.finalMessage();
          if (final.stop_reason === "refusal") {
            // Mid-stream refusals bill the partial; don't keep or show it.
            text = "";
            controller.enqueue(encoder.encode("\n\n[This reply couldn't be completed. Try asking in a different way.]"));
          }
          if (text.trim()) await appendMessage(conversationId, "assistant", text);
        } catch (err) {
          console.error("chat stream failed", err);
          controller.enqueue(encoder.encode("\n\n[Something went wrong. Please try again.]"));
        } finally {
          controller.close();
        }
      },
      cancel() {
        stream.abort();
      },
    });

    return new Response(body_, {
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  } catch (err) {
    if (err instanceof ChatAccessError) return Response.json({ error: err.message }, { status: err.status });
    console.error("chat failed", err);
    return Response.json({ error: "The conversation couldn't be started. Please try again." }, { status: 500 });
  }
}
