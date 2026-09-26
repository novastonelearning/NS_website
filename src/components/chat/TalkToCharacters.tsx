"use client";

// The film's "Talk to the characters" page, rebuilt from the Claude Design
// handoff (clever-minds-character-chat/project/Character Chat Dark.dc.html):
// cast column + Notebook on the left, the conversation on the right. The MORAL
// Coach is a separate step, reached from the tab above the conversation.
import Link from "next/link";
import { CoBrandHeader, type School } from "@/components/CoBrandHeader";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type CastMember = {
  id: string;
  slug: string;
  name: string;
  role: string;
  intro: string;
  opener: string;
  suggested: string[];
  portrait: string | null;
};

export type Message = { id?: number; role: "user" | "assistant"; content: string };
export type Thread = Message[];

export type NotebookEntry = {
  id: string;
  character_id: string | null;
  bullets: string[];
  body: string;
  created_at: string;
  auto_generated: boolean;
};

type Props = {
  film: { slug: string; title: string };
  school: School | null;
  cast: CastMember[];
  initialThreads: Record<string, Thread>;
  initialNotebook: NotebookEntry[];
  initialReflection: string;
  coachSeesSummaries: boolean;
  startInCoach: boolean;
};

// Exported files are opened in Word or printed, where CSS variables don't
// exist, so the palette from globals.css is repeated here as literal hex.
const PRINT = { heading: "#3E3F86", body: "#1E2044", muted: "#62647F", accent: "#EDB44A", rule: "#E4E0EA" };

const COACH = "coach";
const REFLECTION = "reflection";

const COACH_OPENER =
  "I'm your MORAL Coach for this film. We'll work through the five steps together: Mind the Context, Outline the Stakeholders, Review the Options, Assess the Process and Lead with Integrity. There are no right answers here, only well-reasoned ones. Whenever you're ready, tell me your first reaction to the dilemma.";

const COACH_SUGGESTED = ["I'm ready to start.", "What is the MORAL framework?", "Where should I begin?"];

const MORAL_STEPS: [string, string][] = [
  ["M", "ind the Context"],
  ["O", "utline the Stakeholders"],
  ["R", "eview the Options"],
  ["A", "ssess the Process"],
  ["L", "ead with Integrity"],
];

const initials = (name: string) =>
  name
    .replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Principal|Vice Principal|Superintendent)\s+/i, "")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const shortName = (name: string) => name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s+/, "").split(" ").at(-1) ?? name;

function Avatar({ person, size, ring }: { person: { name: string; portrait?: string | null }; size: number; ring?: boolean }) {
  const style = { width: size, height: size, fontSize: size * 0.36 };
  const ringCls = ring ? "ring-2 ring-gold-500 ring-offset-2 ring-offset-ink-500" : "";
  if (person.portrait) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={person.portrait} alt="" style={style} className={`shrink-0 rounded-full object-cover ${ringCls}`} />;
  }
  return (
    <span
      aria-hidden
      style={style}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-linear-135 from-plum-700 to-ink-600 font-serif font-semibold text-gold-400 ${ringCls}`}
    >
      {person.name === "MORAL Coach" ? "M" : initials(person.name)}
    </span>
  );
}

// Coach replies use Markdown (headings, bold, italics, lists, tables, rules);
// characters speak plainly. Rendered as React elements, never raw HTML.
function RichText({ text }: { text: string }) {
  const inline = (s: string, key: number): ReactNode => (
    <Fragment key={key}>
      {s.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : part.length > 2 && part.startsWith("*") && part.endsWith("*") ? (
          <em key={i}>{part.slice(1, -1)}</em>
        ) : (
          part
        ),
      )}
    </Fragment>
  );
  const cells = (row: string) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(block)) return <hr key={i} className="my-4 border-hairline" />;
        if (lines.length >= 2 && lines.every((l) => l.trim().startsWith("|")) && /^\s*\|?\s*:?-{2,}/.test(lines[1])) {
          const [head, , ...rows] = lines;
          return (
            <div key={i} className="mb-3 overflow-x-auto last:mb-0">
              <table className="w-full border-collapse font-sans text-[13px]">
                <thead>
                  <tr>{cells(head).map((c, j) => <th key={j} className="border-b border-hairline px-2 py-1.5 text-left font-semibold text-gold-500">{inline(c, j)}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((r, k) => (
                    <tr key={k}>{cells(r).map((c, j) => <td key={j} className="border-b border-hairline px-2 py-1.5 align-top">{inline(c, j)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        const heading = lines[0].match(/^#{1,4}\s+(.*)$/);
        const rest = heading ? lines.slice(1) : lines;
        const LIST_ITEM = /^\s*([-*•]|\d+\.)\s+/;
        let body: ReactNode = null;
        if (rest.length && rest.every((l) => LIST_ITEM.test(l))) {
          const items = rest.map((l, j) => <li key={j}>{inline(l.replace(LIST_ITEM, ""), j)}</li>);
          body = /^\s*\d+\./.test(rest[0]) ? (
            <ol className="mb-3 list-decimal pl-5 last:mb-0">{items}</ol>
          ) : (
            <ul className="mb-3 list-disc pl-5 last:mb-0">{items}</ul>
          );
        } else if (rest.length) {
          body = (
            <p className="mb-3 last:mb-0">
              {rest.map((l, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  {inline(l, j)}
                </Fragment>
              ))}
            </p>
          );
        }
        return (
          <Fragment key={i}>
            {heading && (
              <p className="mb-2 font-sans text-[13px] font-bold uppercase tracking-[0.12em] text-gold-500">
                {heading[1].replace(/\*\*/g, "")}
              </p>
            )}
            {body}
          </Fragment>
        );
      })}
    </>
  );
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export default function TalkToCharacters(props: Props) {
  const { film, school, cast } = props;
  const [panel, setPanel] = useState<"characters" | "coach">(props.startInCoach ? "coach" : "characters");
  const [activeId, setActiveId] = useState(cast[0]?.id ?? "");
  const [threads, setThreads] = useState<Record<string, Thread>>(props.initialThreads);
  const [notebook, setNotebook] = useState<NotebookEntry[]>(props.initialNotebook);
  const [notebookTab, setNotebookTab] = useState<string>(cast[0]?.id ?? REFLECTION);
  const [reflection, setReflection] = useState(props.initialReflection);
  const [reflectionState, setReflectionState] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null); // thread key awaiting a reply
  const [summarizing, setSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const threadKey = panel === "coach" ? COACH : activeId;
  const active = cast.find((c) => c.id === activeId);
  const speaker = panel === "coach" ? { name: "MORAL Coach", portrait: null } : active ?? { name: "", portrait: null };
  const thread = useMemo(() => threads[threadKey] ?? [], [threads, threadKey]);
  const hasChatted = cast.some((c) => (threads[c.id] ?? []).some((m) => m.role === "user"));

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [thread, pending, panel, activeId]);

  // Save the reflection a moment after typing stops.
  useEffect(() => {
    if (reflectionState !== "unsaved") return;
    const t = setTimeout(async () => {
      setReflectionState("saving");
      const res = await fetch("/api/chat/reflection", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ film: film.slug, body: reflection }),
      }).catch(() => null);
      setReflectionState(res?.ok ? "saved" : "error");
    }, 900);
    return () => clearTimeout(t);
  }, [reflection, reflectionState, film.slug]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || pending) return;
    const key = threadKey;
    setError(null);
    setDraft("");
    setPending(key);
    setThreads((t) => ({ ...t, [key]: [...(t[key] ?? []), { role: "user", content: message }] }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ film: film.slug, character: key === COACH ? null : cast.find((c) => c.id === key)?.slug, message }),
      });
      if (!res.ok || !res.body) {
        const detail = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(detail?.error ?? "The message couldn't be sent.");
      }
      setThreads((t) => ({ ...t, [key]: [...(t[key] ?? []), { role: "assistant", content: "" }] }));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setThreads((t) => {
          const list = [...(t[key] ?? [])];
          const last = list.at(-1)!;
          list[list.length - 1] = { ...last, content: last.content + chunk };
          return { ...t, [key]: list };
        });
      }
      if (key === COACH) await refreshCoachIds();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The message couldn't be sent.");
    } finally {
      setPending(null);
    }
  }

  // Coach replies need their database ids so one can be saved to the Notebook.
  async function refreshCoachIds() {
    const res = await fetch(`/api/chat/thread?film=${encodeURIComponent(film.slug)}`).catch(() => null);
    if (!res?.ok) return;
    const { messages } = (await res.json()) as { messages: Message[] };
    setThreads((t) => ({ ...t, [COACH]: messages }));
  }

  async function summarize() {
    if (!active || summarizing) return;
    setSummarizing(true);
    setError(null);
    const res = await fetch("/api/chat/summarize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ film: film.slug, character: active.slug }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { entry?: NotebookEntry; error?: string } | null;
    if (data?.entry) {
      setNotebook((n) => [data.entry!, ...n]);
      setNotebookTab(active.id);
    } else {
      setError(data?.error ?? "The summary couldn't be written.");
    }
    setSummarizing(false);
  }

  async function saveReport(messageId: number) {
    const res = await fetch("/api/chat/notebook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ film: film.slug, messageId }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { entry?: NotebookEntry; error?: string } | null;
    if (data?.entry) {
      setNotebook((n) => [data.entry!, ...n]);
      setNotebookTab(COACH);
    } else setError(data?.error ?? "The report couldn't be saved.");
  }

  const tabEntries = useMemo(
    () => notebook.filter((e) => (notebookTab === COACH ? e.character_id === null : e.character_id === notebookTab)),
    [notebook, notebookTab],
  );
  const tabPerson = cast.find((c) => c.id === notebookTab);
  const canSummarize = panel === "characters" && !!active && notebookTab === active.id && (threads[active.id] ?? []).some((m) => m.role === "user");
  const hasDownload = notebookTab === REFLECTION ? !!reflection.trim() : tabEntries.length > 0;

  function buildDoc() {
    const stamp = (e: NotebookEntry) => new Date(e.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    const base = film.slug;
    const credit = escapeHtml(school ? `${school.name} · Novastone Learning` : "Novastone Learning");
    const header = `<p style="font-family: Arial, sans-serif; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: ${PRINT.muted}; border-bottom: 1px solid ${PRINT.rule}; padding-bottom: 8px; margin: 0 0 14px;">${credit}</p>`;
    let html = header + `<h1 style="font-family: Georgia, serif; color: ${PRINT.heading};">${escapeHtml(film.title)} — Notebook</h1>`;
    if (notebookTab === REFLECTION) {
      html = header + `<h1 style="font-family: Georgia, serif; color: ${PRINT.heading};">${escapeHtml(film.title)} — My Reflection</h1>` +
        `<p style="font-family: Georgia, serif; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(reflection)}</p>`;
      return { filename: `${base}-reflection`, html };
    }
    const title = notebookTab === COACH ? "MORAL Coach reports" : `${tabPerson?.name} <span style="color:${PRINT.muted}; font-size: 14px; font-weight: normal;">— ${escapeHtml(tabPerson?.role ?? "")}</span>`;
    html += `<h2 style="font-family: Georgia, serif; color: ${PRINT.heading};">${title}</h2>`;
    for (const e of tabEntries) {
      html += `<div style="margin-top: 18px; border-left: 3px solid ${PRINT.accent}; padding-left: 12px;"><div style="font-family: Arial, sans-serif; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: ${PRINT.muted};">${escapeHtml(stamp(e))}</div>`;
      html += e.bullets.length
        ? `<ul style="font-family: Georgia, serif; font-size: 13px; line-height: 1.55;">${e.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`
        : `<p style="font-family: Georgia, serif; font-size: 13px; line-height: 1.55; white-space: pre-wrap;">${escapeHtml(e.body)}</p>`;
      html += "</div>";
    }
    return { filename: `${base}-${notebookTab === COACH ? "coach-report" : tabPerson?.slug}`, html };
  }

  function downloadWord() {
    const { filename, html } = buildDoc();
    const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${filename}</title></head><body>${html}</body></html>`;
    const url = URL.createObjectURL(new Blob(["﻿", doc], { type: "application/msword" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${filename}.doc` });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 0);
  }

  function downloadPdf() {
    const { filename, html } = buildDoc();
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><meta charset="utf-8"><title>${filename}</title><style>@page { margin: 0.9in; } body { font-family: Georgia, serif; color: ${PRINT.body}; max-width: 720px; margin: 0 auto; padding: 24px; }</style></head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  const opener = panel === "coach" ? COACH_OPENER : active?.opener;
  const suggestions = panel === "coach" ? COACH_SUGGESTED : active?.suggested ?? [];
  const busy = pending !== null;
  const count = ["zero", "one", "two", "three", "four", "five", "six"][cast.length] ?? String(cast.length);

  return (
    <div className="relative min-h-screen bg-ink-900 bg-[radial-gradient(1200px_600px_at_20%_-10%,var(--color-ink-500)_0%,var(--color-ink-900)_55%)] bg-fixed text-paper-100">
      <CoBrandHeader school={school} homeHref="/library" className="sticky top-0 z-10">
        <div className="inline-flex items-center gap-2 text-[13px] text-paper-300" aria-live="polite">
          <span
            className={`h-2 w-2 rounded-full ${reflectionState === "error" ? "bg-danger-200" : "bg-success-400 shadow-[0_0_8px_color-mix(in_srgb,var(--color-success-400)_60%,transparent)]"}`}
          />
          <span className="max-sm:sr-only">
            {reflectionState === "error" ? "Not saved" : reflectionState === "saved" ? "Session saved" : "Saving…"}
          </span>
        </div>
        <Link href="/library" className="btn-outline h-9 w-9 gap-2 text-[13px] sm:h-auto sm:w-auto sm:px-4 sm:py-2">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          <span className="max-sm:sr-only">Back to library</span>
        </Link>
      </CoBrandHeader>

      {/* Film context strip */}
      <div className="relative z-[2] mx-auto max-w-[1340px] px-4 pt-9 pb-2 sm:px-8">
        <div className="mb-3 inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.18em] text-gold-500">
          <span className="h-0.5 w-6 bg-gold-500" />
          Talk to the people inside the dilemma
        </div>
        <h1 className="mb-3 font-serif text-[clamp(30px,4.2vw,44px)] font-semibold leading-[1.06] tracking-[-0.015em]">
          You just watched <em className="text-gold-500">{film.title}</em>.
          <br className="hidden sm:block" /> Now sit with the {count} people at the center of it.
        </h1>
        <p className="max-w-[720px] font-serif text-[17px] leading-[1.55] text-paper-500">
          Each character speaks from inside the film&apos;s moment, with their own stake, their own blind spots, and the language they&apos;d actually use. Pick one and stay a while.
        </p>
      </div>

      <div className="relative z-[2] mx-auto grid max-w-[1340px] items-start gap-7 px-4 pt-6 pb-12 sm:px-8 lg:grid-cols-[380px_1fr]">
        {/* Cast + Notebook column */}
        <aside className="order-2 flex min-w-0 flex-col gap-5 lg:order-1">
          <div className="hidden lg:block">
            <div className="mx-1 mb-3 mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-paper-500">The cast</div>
            <CastList cast={cast} activeId={panel === "characters" ? activeId : ""} onPick={(id) => { setPanel("characters"); setActiveId(id); setNotebookTab(id); }} />
          </div>

          {/* Notebook */}
          <div className="overflow-hidden rounded-2xl border border-hairline bg-ink-500 shadow-[0_20px_40px_rgba(0,0,0,0.45)]">
            <div className="border-b border-hairline bg-linear-to-b from-ink-900 to-ink-500 px-[18px] pt-4 pb-3.5">
              <div className="flex items-center gap-2.5">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" />
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M9 7h7M9 11h7" />
                </svg>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-500">Notebook</div>
              </div>
              <div className="mt-1 font-serif text-xl font-semibold leading-[1.15]">{film.title} Notebook</div>
              <div className="mt-1.5 font-serif text-[12.5px] italic leading-[1.5] text-paper-500">
                Summarize what each character told you. Close with your own reflection.
              </div>
            </div>

            <div role="tablist" className="flex gap-0.5 overflow-x-auto border-b border-hairline bg-ink-700 px-2.5 pt-2">
              {[...cast.map((c) => ({ id: c.id, label: shortName(c.name) })), { id: COACH, label: "Coach" }, { id: REFLECTION, label: "Reflection" }].map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={notebookTab === t.id}
                  onClick={() => setNotebookTab(t.id)}
                  className={`flex-none whitespace-nowrap rounded-t border-b-2 px-3 pt-2.5 pb-[9px] text-xs font-semibold transition-colors ${
                    notebookTab === t.id ? "border-gold-500 bg-ink-500 text-gold-500" : "border-transparent text-paper-500 hover:text-paper-100"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="px-[18px] pt-4 pb-[18px]">
              {notebookTab === REFLECTION ? (
                <div>
                  <div className="font-serif text-base font-semibold leading-[1.2]">Your reflection</div>
                  <div className="mt-0.5 text-xs text-paper-500">What you&apos;d carry into your own leadership.</div>
                  <div className="mt-3 rounded-lg border border-gold-500/28 bg-gold-500/14 px-3 py-2.5 font-serif text-[12.5px] italic leading-[1.55]">
                    Use the MORAL frame:{" "}
                    {MORAL_STEPS.map(([l, rest], i) => (
                      <span key={l}>
                        <b className="not-italic text-gold-500">{l}</b>
                        {rest}
                        {i < MORAL_STEPS.length - 1 ? ", " : "."}
                      </span>
                    ))}
                  </div>
                  <textarea
                    rows={8}
                    value={reflection}
                    maxLength={20000}
                    onChange={(e) => { setReflection(e.target.value); setReflectionState("unsaved"); }}
                    placeholder="Start typing…"
                    aria-label="Your reflection"
                    className="mt-3 min-h-40 w-full resize-y rounded-lg border border-paper-100/18 bg-ink-700 px-3.5 py-3 font-serif text-sm leading-[1.6] outline-none placeholder:text-paper-600"
                  />
                  <div className="mt-1.5 text-[11px] text-paper-600">
                    {reflection.length.toLocaleString()} characters{props.coachSeesSummaries ? " · The MORAL Coach can read your reflection." : ""}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-serif text-base font-semibold leading-[1.2]">{notebookTab === COACH ? "MORAL Coach" : tabPerson?.name}</div>
                  <div className="mt-0.5 text-xs text-paper-500">{notebookTab === COACH ? "Saved reports from your coaching session" : tabPerson?.role}</div>
                  <div className="mt-3 flex max-h-[260px] flex-col gap-2.5 overflow-y-auto">
                    {tabEntries.length === 0 && (
                      <div className="rounded-lg border border-dashed border-paper-100/18 bg-ink-700 px-3.5 py-3 font-serif text-[13px] italic leading-[1.55] text-paper-500">
                        {notebookTab === COACH ? (
                          <>No reports yet. When the Coach writes your summary report, press <b className="not-italic text-gold-500">Save to Notebook</b> under it.</>
                        ) : (
                          <>No notes yet. Chat with {tabPerson ? shortName(tabPerson.name) : "them"} and press <b className="not-italic text-gold-500">Summarize this chat</b> to capture the exchange.</>
                        )}
                      </div>
                    )}
                    {tabEntries.map((e) => (
                      <div key={e.id} className="rounded-r-lg border border-l-[3px] border-hairline border-l-gold-500 bg-ink-700 px-3.5 py-3">
                        <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-paper-500">
                          {new Date(e.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          {e.auto_generated ? " · auto" : ""}
                        </div>
                        {e.bullets.length ? (
                          <ul className="mt-1.5 list-disc pl-4 font-serif text-[13px] leading-[1.55]">
                            {e.bullets.map((b, i) => <li key={i} className="mb-1">{b}</li>)}
                          </ul>
                        ) : (
                          <div className="mt-1.5 max-h-40 overflow-y-auto font-serif text-[13px] leading-[1.55]"><RichText text={e.body} /></div>
                        )}
                      </div>
                    ))}
                  </div>
                  {notebookTab !== COACH && (
                    <button
                      onClick={summarize}
                      disabled={!canSummarize || summarizing}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gold-500 bg-gold-500 px-3 py-2.5 text-[13px] font-semibold text-plum-600 transition disabled:cursor-not-allowed disabled:border-hairline disabled:bg-paper-100/6 disabled:text-paper-600"
                    >
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z" />
                      </svg>
                      {summarizing ? "Summarizing…" : "Summarize this chat"}
                    </button>
                  )}
                </div>
              )}

              <div className="mt-3.5 flex gap-2 border-t border-hairline pt-3.5">
                <button
                  onClick={downloadPdf}
                  disabled={!hasDownload}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gold-500 bg-gold-500 px-2.5 py-[9px] text-[12.5px] font-semibold text-plum-600 disabled:cursor-not-allowed disabled:border-hairline disabled:bg-paper-100/6 disabled:text-paper-600"
                >
                  PDF
                </button>
                <button
                  onClick={downloadWord}
                  disabled={!hasDownload}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gold-500 px-2.5 py-[9px] text-[12.5px] font-semibold text-gold-500 disabled:cursor-not-allowed disabled:border-hairline disabled:bg-paper-100/6 disabled:text-paper-600"
                >
                  Word
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gold-500/28 bg-gold-500/14 p-3.5">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-gold-500">Using the MORAL frame?</div>
            <div className="font-serif text-[13px] leading-[1.5]">
              These characters aren&apos;t there to give you the answer. Ask what they saw, what they feared, what they weighed. When you&apos;re ready, take it to the MORAL Coach.
            </div>
          </div>
        </aside>

        {/* Conversation column */}
        <section className="order-1 flex h-[calc(100vh-140px)] min-h-[620px] min-w-0 flex-col overflow-hidden rounded-2xl border border-hairline bg-ink-500 shadow-[0_24px_60px_rgba(0,0,0,0.55)] lg:order-2">
          {/* Characters / Coach switch */}
          <div role="tablist" className="flex gap-1 border-b border-hairline bg-ink-700 px-3 pt-2">
            <button role="tab" aria-selected={panel === "characters"} onClick={() => setPanel("characters")}
              className={`rounded-t px-4 pt-2.5 pb-2 text-[13px] font-semibold ${panel === "characters" ? "border-b-2 border-gold-500 bg-ink-500 text-gold-500" : "text-paper-500 hover:text-paper-100"}`}>
              Characters
            </button>
            <button role="tab" aria-selected={panel === "coach"} onClick={() => setPanel("coach")}
              className={`inline-flex items-center gap-2 rounded-t px-4 pt-2.5 pb-2 text-[13px] font-semibold ${panel === "coach" ? "border-b-2 border-gold-500 bg-ink-500 text-gold-500" : "text-paper-500 hover:text-paper-100"}`}>
              MORAL Coach
              {hasChatted && panel !== "coach" && (threads[COACH] ?? []).length === 0 && (
                <span className="rounded-full bg-gold-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-plum-600">Next step</span>
              )}
            </button>
          </div>

          {/* Mobile cast strip */}
          {panel === "characters" && (
            <div className="flex gap-2 overflow-x-auto border-b border-hairline px-3 py-2.5 lg:hidden">
              {cast.map((c) => (
                <button key={c.id} onClick={() => { setActiveId(c.id); setNotebookTab(c.id); }}
                  className={`flex flex-none items-center gap-2 rounded-full border px-2 py-1.5 pr-3.5 text-[13px] font-semibold ${c.id === activeId ? "border-gold-500/35 bg-ink-400" : "border-hairline"}`}>
                  <Avatar person={c} size={28} />
                  {shortName(c.name)}
                </button>
              ))}
            </div>
          )}

          <header className="flex items-center gap-3.5 border-b border-hairline bg-linear-to-b from-gold-500/6 to-transparent px-4 py-4 sm:px-6 sm:py-5">
            <Avatar person={speaker} size={56} ring />
            <div className="min-w-0 flex-1">
              <div className="font-serif text-[22px] font-semibold leading-[1.1]">{speaker.name}</div>
              <div className="mt-[3px] text-[13px] text-paper-500">
                {panel === "coach" ? "Works through the five MORAL steps with you" : active?.role}
                <span className="mx-1.5 text-paper-600">·</span>
                {panel === "coach" ? "for" : "from"} <em>{film.title}</em>
              </div>
            </div>
            <span className="hidden rounded-full bg-gold-500 px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-plum-600 sm:inline">
              {panel === "coach" ? "AI coach" : "AI character"}
            </span>
          </header>

          {panel === "coach" ? (
            props.coachSeesSummaries && (
              <div className="px-4 pt-3 sm:px-6">
                <div className="rounded-r-lg border-l-[3px] border-gold-500 bg-gold-500/14 px-4 py-2.5 text-[13px] leading-[1.5]">
                  The Coach can see your Notebook summaries and your reflection, and may ask you about what the characters told you. Your feedback is based only on your own answers.
                </div>
              </div>
            )
          ) : (
            active?.intro && (
              <div className="px-4 pt-4 pb-1 sm:px-6">
                <div className="rounded-r-lg border-l-[3px] border-gold-500 bg-gold-500/14 px-4 py-3 font-serif text-[15px] italic leading-[1.55]">
                  &ldquo;{active.intro}&rdquo;
                </div>
              </div>
            )
          )}

          {/* Message log */}
          <div ref={logRef} className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-4 pt-5 pb-2 sm:px-6" aria-live="polite">
            {opener && <Bubble role="assistant" speaker={speaker} text={opener} rich={panel === "coach"} />}
            {thread.map((m, i) => (
              <div key={m.id ?? `local-${i}`} className="flex flex-col">
                <Bubble role={m.role} speaker={speaker} text={m.content} rich={panel === "coach"} />
                {panel === "coach" && m.role === "assistant" && m.id && m.content.length > 600 && (
                  <button onClick={() => saveReport(m.id!)} className="ml-11 mt-1.5 self-start text-xs font-semibold text-gold-500 hover:text-gold-400">
                    Save to Notebook
                  </button>
                )}
              </div>
            ))}
            {pending === threadKey && thread.at(-1)?.role === "user" && (
              <div className="flex items-end gap-3">
                <Avatar person={speaker} size={32} />
                <div className="rounded-2xl rounded-bl-sm border border-hairline bg-ink-700 px-[18px] py-[15px]">
                  <span className="inline-flex gap-[5px]">
                    {[0, 0.15, 0.3].map((d) => (
                      <span key={d} className="h-[7px] w-[7px] animate-bounce rounded-full bg-paper-500" style={{ animationDelay: `${d}s` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {error && <div role="alert" className="mx-4 mb-1 rounded-lg bg-danger-500/15 px-3 py-2 text-[13px] text-danger-200 sm:mx-6">{error}</div>}

          {thread.length === 0 && (
            <div className="flex flex-wrap gap-2 px-4 pt-2 sm:px-6">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} disabled={busy}
                  className="rounded-full border border-gold-500/28 bg-gold-500/14 px-3.5 py-2 text-[13px] text-gold-500 transition-colors hover:bg-gold-500/22 disabled:opacity-50">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Composer */}
          <form className="px-4 pt-3.5 pb-3 sm:px-6" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
            <div className="flex items-end gap-2.5 rounded-xl border border-paper-100/18 bg-ink-700 py-2 pr-2 pl-4">
              <textarea
                rows={1}
                value={draft}
                maxLength={4000}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(draft); } }}
                placeholder={panel === "coach" ? "Answer the Coach…" : `Ask ${active?.name ?? ""} a question…`}
                aria-label="Your message"
                className="max-h-[120px] flex-1 resize-none bg-transparent py-2 text-[15px] leading-[1.5] outline-none placeholder:text-paper-600"
              />
              <button type="submit" disabled={!draft.trim() || busy} aria-label="Send"
                className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-lg bg-gold-500 text-plum-600 shadow-[0_0_24px_color-mix(in_srgb,var(--color-gold-500)_35%,transparent)] transition disabled:cursor-not-allowed disabled:bg-paper-100/10 disabled:text-paper-600 disabled:shadow-none">
                <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
                </svg>
              </button>
            </div>
            <div className="mt-2.5 text-center text-[11px] text-paper-600">
              {panel === "coach"
                ? "The Coach guides your reasoning; it won't give you the answer."
                : <>Responses are AI-generated. Each character speaks from inside <em>{film.title}</em>.</>}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function CastList({ cast, activeId, onPick }: { cast: CastMember[]; activeId: string; onPick: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {cast.map((c) => {
        const on = c.id === activeId;
        return (
          <button key={c.id} onClick={() => onPick(c.id)} aria-pressed={on}
            className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors hover:border-paper-100/18 hover:bg-ink-400 ${on ? "border-gold-500/35 bg-ink-400" : "border-hairline bg-ink-500"}`}>
            <Avatar person={c} size={42} ring={on} />
            <div className="min-w-0 flex-1">
              <div className="font-serif text-base font-semibold leading-[1.15]">{c.name}</div>
              <div className="mt-0.5 text-xs text-paper-500">{c.role}</div>
            </div>
            {on && <span className="h-10 w-1.5 rounded-full bg-gold-500 shadow-[0_0_12px_color-mix(in_srgb,var(--color-gold-500)_50%,transparent)]" />}
          </button>
        );
      })}
    </div>
  );
}

function Bubble({ role, speaker, text, rich }: { role: "user" | "assistant"; speaker: { name: string; portrait?: string | null }; text: string; rich: boolean }) {
  const mine = role === "user";
  return (
    <div className={`flex max-w-[88%] gap-3 sm:max-w-[82%] ${mine ? "flex-row-reverse self-end" : "self-start"}`}>
      {!mine && <span className="flex-none self-end"><Avatar person={speaker} size={32} /></span>}
      <div className={`rounded-2xl px-[17px] py-[13px] text-[15px] leading-[1.6] ${mine ? "rounded-br-sm bg-gold-500 font-sans text-plum-600" : "rounded-bl-sm border border-hairline bg-ink-700 font-serif"}`}>
        {mine || !rich ? text.split(/\n{2,}/).map((p, i) => <p key={i} className="mb-3 whitespace-pre-wrap last:mb-0">{p}</p>) : <RichText text={text} />}
      </div>
    </div>
  );
}
