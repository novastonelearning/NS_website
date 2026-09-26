// Calls to Claude. Server-only: the API key never reaches the browser.
import Anthropic from "@anthropic-ai/sdk";

// Anthropic's API terms exclude training on API inputs and outputs, which the
// FERPA note requires for student transcripts.
export const CHAT_MODEL = "claude-opus-5";

// If a safety classifier declines a turn, the API re-runs it on Anthropic's
// recommended fallback model inside the same call rather than failing it.
// A classroom role-play touching drugs or discrimination could trip one.
const FALLBACK: { betas: Anthropic.Beta.AnthropicBeta[]; fallbacks: Anthropic.Beta.Messages.BetaFallbacksParam } = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
};

let client: Anthropic | null = null;
export function anthropic() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local (console.anthropic.com > API keys).");
  }
  return (client ??= new Anthropic());
}

export type Turn = { role: "user" | "assistant"; content: string };

// Characters answer conversationally, so a light effort keeps replies quick;
// the coach evaluates reasoning and writes the report, so it thinks harder.
export function streamReply(system: Anthropic.Beta.BetaTextBlockParam[], turns: Turn[], kind: "character" | "coach") {
  return anthropic().beta.messages.stream({
    ...FALLBACK,
    model: CHAT_MODEL,
    max_tokens: 64000,
    output_config: { effort: kind === "coach" ? "high" : "low" },
    system,
    messages: turns,
  });
}

const SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    bullets: { type: "array", items: { type: "string" } },
  },
  required: ["bullets"],
  additionalProperties: false,
};

// Notebook bullets for one character interview, written to the student.
export async function summarizeChat(characterName: string, filmTitle: string, turns: Turn[]): Promise<string[]> {
  const transcript = turns
    .map((t) => `${t.role === "user" ? "STUDENT" : characterName.toUpperCase()}: ${t.content}`)
    .join("\n\n");

  const response = await anthropic().beta.messages.create({
    ...FALLBACK,
    model: CHAT_MODEL,
    max_tokens: 16000,
    output_config: { effort: "low", format: { type: "json_schema", schema: SUMMARY_SCHEMA } },
    system:
      `You write Notebook entries for a graduate student in educational leadership who has just interviewed ${characterName}, ` +
      `a character from the case film "${filmTitle}". Summarize the interview in 3 to 6 short bullets, addressed to the student ` +
      `("You asked…", "${characterName.split(" ").at(-1)} said…"). Capture what the character revealed: their reasons, pressures, ` +
      `fears and any admissions or evasions. Attribute every claim to whoever made it. Do not evaluate the student or add your own opinions.`,
    messages: [{ role: "user", content: `<transcript>\n${transcript}\n</transcript>` }],
  });

  if (response.stop_reason === "refusal") return ["This conversation couldn't be summarized automatically."];
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return [];
  const parsed = JSON.parse(text.text) as { bullets?: unknown };
  return Array.isArray(parsed.bullets) ? parsed.bullets.filter((b): b is string => typeof b === "string").slice(0, 8) : [];
}
