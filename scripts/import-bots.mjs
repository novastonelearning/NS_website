// One-time import: turns Melissa's character-bot .docx files into
// content/films/<film>/characters/<slug>.md drafts for review.
// Uses macOS `textutil` to read .docx. Existing files are never overwritten.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC = join(import.meta.dirname, "..", "..");
const OUT = join(import.meta.dirname, "..", "content", "films");

// Canonical names settle the spelling inconsistencies between file names and text.
const FILMS = [
  { slug: "pedagogy-and-prejudice", dir: "Pedagogy and Prejudice", title: "Pedagogy and Prejudice", episode: 1, cast: [
    { file: "Jamal", slug: "jamal", name: "Jamal", role: "Student", pronouns: "he/him" },
    { file: "Mrs. Woods", slug: "ms-woods", name: "Ms. Woods", role: "Teacher", pronouns: "she/her", aliases: ["Mrs. Woods"] },
    { file: "Vice Principal Miliken", slug: "vice-principal-milikan", name: "Vice Principal Milikan", role: "Vice principal", pronouns: "he/him", aliases: ["Miliken"] },
  ] },
  { slug: "gift-of-gab", dir: "Gift of Gab", title: "Gift of Gab", episode: 2, cast: [
    { file: "Principal Haynes", slug: "principal-haynes", name: "Principal Haynes", role: "Principal", pronouns: "she/her" },
    { file: "Mr. Connor", slug: "mr-connor", name: "Mr. Connor", role: "CEO, Smart Sounds", pronouns: "he/him" },
  ] },
  { slug: "the-child-left-behind", dir: "The Child Left Behind", title: "The Child Left Behind", episode: 3, cast: [
    { file: "Anna Williams", slug: "anna-williams", name: "Anna Williams", role: "Josh's mother", pronouns: "she/her" },
    { file: "Josh Williams", slug: "josh-williams", name: "Josh Williams", role: "Seventh-grade student", pronouns: "he/him" },
    { file: "Principal Harris", slug: "principal-harris", name: "Principal Harris", role: "Principal", pronouns: "she/her" },
  ] },
  { slug: "audit-elementary", dir: "Audit Elementary", title: "Audit Elementary", episode: 4, cast: [
    { file: "Principal Flemming", slug: "principal-flemming", name: "Principal Flemming", role: "Principal, Longhunter Elementary", pronouns: "he/him" },
    { file: "Principal Allen", slug: "principal-allen", name: "Principal Allen", role: "Former principal (retired)", pronouns: "he/him" },
    { file: "Joy Reid", slug: "joy-reid", name: "Joy Reid", role: "Teacher; chair, Faculty Sunshine Committee", pronouns: "she/her" },
    { file: "Mary Johnson", slug: "mary-johnson", name: "Mary Johnson", role: "Teacher; three-time Teacher of the Year", pronouns: "she/her" },
  ] },
  { slug: "clever-minds", dir: "Clever Minds", title: "Clever Minds", episode: 5, cast: [
    { file: "Donna Summers", slug: "donna-summers", name: "Dr. Donna Summers", role: "Principal, East Fork Elementary", pronouns: "she/her" },
    { file: "Clayton Barden", slug: "clayton-barden", name: "Clayton Barden", role: "Director of Curriculum", pronouns: "he/him" },
    { file: "Greg Berkey", slug: "greg-berkey", name: "Greg Berkey", role: "History teacher", pronouns: "he/him" },
  ] },
  { slug: "to-be-or-not-to-be-renewed", dir: "To Be Or Not To Be Renewed", title: "To Be Or Not To Be Renewed", episode: 6, cast: [
    { file: "Principal Reed", slug: "principal-reed", name: "Principal Evan Reed", role: "Principal", pronouns: "he/him" },
    { file: "John Stevenson", slug: "john-stevenson", name: "John Stevenson", role: "Teacher", pronouns: "he/him" },
    { file: "Lynn Peterson", slug: "lynn-peterson", name: "Lynn Peterson", role: "Teacher", pronouns: "she/her" },
  ] },
  { slug: "zero-tolerance", dir: "Zero Tolerance", title: "Zero Tolerance", episode: 7, cast: [
    { file: "Principal Ford", slug: "principal-ford", name: "Principal Brian Ford", role: "Principal, Mariana Adams High School", pronouns: "he/him" },
    { file: "Corey Allen", slug: "cory-allen", name: "Cory Allen", role: "Student; Student Safety Council", pronouns: "he/him", aliases: ["Corey Allen"] },
    { file: "Mason Gill", slug: "mason-gill", name: "Mason Gill", role: "Student; Student Safety Council", pronouns: "he/him" },
    { file: "Torian Jackson", slug: "torian-jackson", name: "Torian Jackson", role: "Student", pronouns: "he/him" },
  ] },
  { slug: "the-social-dilemma", dir: "The Social Dilemma", title: "The Social Dilemma", episode: 8, cast: [
    { file: "Principal Reeves", slug: "principal-reeves", name: "Principal Reeves", role: "Principal", pronouns: "she/her" },
    { file: "Sarah Williams", slug: "sarah-williams", name: "Sarah Williams", role: "Second-grade teacher", pronouns: "she/her", aliases: ["Sarah Williamson"] },
    { file: "Janice Neely", slug: "janice-neely", name: "Janice Neely", role: "Paraprofessional and parent", pronouns: "she/her" },
  ] },
  { slug: "challenging-the-curriculum", dir: "Challenging the Curriculum", title: "Challenging the Curriculum", episode: 9, cast: [
    { file: "Principal Hastings", slug: "principal-hastings", name: "Principal Hastings", role: "Principal, Adams Elementary", pronouns: "she/her" },
    { file: "Angela Simms", slug: "angela-simms", name: "Angela Simms", role: "Teacher", pronouns: "she/her" },
    { file: "Ashley Henson", slug: "ashley-henson", name: "Ashley Henson", role: "Parent and education blogger", pronouns: "she/her" },
  ] },
  { slug: "ideological-borders", dir: "Ideological Borders", title: "Ideological Borders", episode: 10, cast: [
    { file: "Principal Seales", slug: "principal-seales", name: "Principal Christopher Seales", role: "Principal, Richland Elementary", pronouns: "he/him" },
    { file: "Superintendent Lacey", slug: "superintendent-lacy", name: "Superintendent Giles Lacy", role: "Superintendent", pronouns: "she/her", aliases: ["Lacey"] },
    { file: "Carlos Rodriguez", slug: "carlos-rodriguez", name: "Carlos Rodriguez", role: "Parent", pronouns: "he/him" },
  ] },
];

// Lines of the shared template; everything else in a doc is character-specific.
const TEMPLATE = [
  /^You are a roleplay assistant built for graduate education students/,
  /^Act as .+ when prompted, voicing your feelings/,
  /^What you can do:?$/, /^Character chat:/, /^Inner world \(inference\):/,
  /^Grounding rules:?$/, /^Stay within the perspective of the one character/,
  /^Do not invent new backstory/, /^Neutrality:/, /^Safety:/,
  /^Interaction shortcuts students can use:?$/, /^["“]Talk to you about/, /^["“]Why did you do/,
  /^["“]Show evidence for your reasoning/, /^["“]Step out of character/,
  /^Clarify only when essential/, /^Formatting:?$/, /^Respond exactly as if you are having/,
  /^Use minimal Markdown/, /^If students upload additional handouts/,
];
const ACT_AS = /^Act as .+? when prompted, voicing .+? tied back to textual cues\.\s*/;

const yamlList = (xs) => `[${xs.map((x) => JSON.stringify(x)).join(", ")}]`;

for (const film of FILMS) {
  const dir = join(OUT, film.slug, "characters");
  mkdirSync(dir, { recursive: true });
  for (const c of film.cast) {
    const docx = join(SRC, film.dir, `${c.file} Character Bot.docx`);
    const text = execFileSync("textutil", ["-convert", "txt", "-stdout", docx], { encoding: "utf8" });
    const lines = text.split("\n").map((l) => l.replace(/^\s*•\s*/, "").trim()).filter(Boolean);

    let forbidden = "";
    const persona = [];
    for (const raw of lines) {
      if (/^(You must speak only in direct dialogue|Speak directly as the character)/.test(raw)) {
        forbidden = ((raw.match(/(?:such as|e\.g\.,)\s*(.+?)\s*(?:These are|Just respond)/) || [])[1] || "").replace(/[\s.)"”]+$/, "").replace(/^([^"]*"[^"]*(?:"[^"]*"[^"]*)*)$/, "$1\"");
        continue;
      }
      const line = raw.replace(ACT_AS, "");
      if (!line || TEMPLATE.some((re) => re.test(line))) continue;
      persona.push(line);
    }

    const out = join(dir, `${c.slug}.md`);
    if (existsSync(out)) { console.log("skip (exists)", out); continue; }
    writeFileSync(out, `---
name: ${JSON.stringify(c.name)}
aliases: ${yamlList(c.aliases ?? [])}
role: ${JSON.stringify(c.role)}
pronouns: ${c.pronouns}
source: ${JSON.stringify(`${film.dir}/${c.file} Character Bot.docx`)}
avoid_actions: ${JSON.stringify(forbidden)}
intro: ""
opener: ""
suggested: []
portrait: ""
status: draft
---

${persona.join("\n\n")}
`);
    console.log("wrote", out);
  }
  const filmMd = join(OUT, film.slug, "film.md");
  if (!existsSync(filmMd)) {
    writeFileSync(filmMd, `---
title: ${JSON.stringify(film.title)}
episode: ${film.episode}
cast: ${yamlList(film.cast.map((c) => c.slug))}
trailer_vimeo_id: ""
film_vimeo_id: ""
logline: ""
---
`);
  }
}
