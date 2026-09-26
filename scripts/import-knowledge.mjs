// One-time import: extracts the text of each film's "Character Bot Knowledge"
// PDFs into content/films/<film>/knowledge/*.md, plus the two shared framework
// PDFs into content/shared/. Uses macOS PDFKit via osascript (no dependencies).
// Images (.jpg) are listed so they can be transcribed by hand.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const SRC = join(import.meta.dirname, "..", "..");
const CONTENT = join(import.meta.dirname, "..", "content");

const FILMS = {
  "pedagogy-and-prejudice": "Pedagogy and Prejudice/PP Character Bot Knowledge",
  "gift-of-gab": "Gift of Gab/Character Bot Knowledge",
  "the-child-left-behind": "The Child Left Behind/CLB Character Bot Knowledge",
  "audit-elementary": "Audit Elementary/Character Bot Knowledge",
  "clever-minds": "Clever Minds/Character Bot Knowledge",
  "to-be-or-not-to-be-renewed": "To Be Or Not To Be Renewed/TBNTB Character Bot Knowledge",
  "zero-tolerance": "Zero Tolerance/ZT Character Bot Knowledge",
  "the-social-dilemma": "The Social Dilemma/SD Character Bot Knowledge",
  "challenging-the-curriculum": "Challenging the Curriculum/CTC Character Bot Knowledge",
  "ideological-borders": "Ideological Borders/IB Character Bot Knowledge",
};

const JXA = `ObjC.import("Quartz");
function run(argv) {
  const d = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(argv[0]));
  const pages = [];
  for (let i = 0; i < d.pageCount; i++) pages.push(d.pageAtIndex(i).string.js || "");
  return pages.join("\\n\\f\\n");
}`;

function pdfText(path) {
  const raw = execFileSync("osascript", ["-l", "JavaScript", "-e", JXA, path], {
    encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
  });
  return raw
    .split("\n")
    .filter((l) => !/^\s*Do not distribute\s*$/i.test(l)) // script watermark
    .filter((l) => !/^\s*\d+\.\s*$/.test(l)) // screenplay page numbers
    .map((l) => l.replace(/\s+\*\s*$/, "").replace(/^\s*\*\s*$/, "").trimEnd()) // revision marks
    .filter((l) => !/^\s*_{3,}\s*$/.test(l))
    .join("\n")
    .replace(/\f/g, "")
    .replace(/[ \t]+_{3,}\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const slugify = (s) => s.toLowerCase().replace(/\(\d+\)/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function writeDoc(outDir, file, srcDir) {
  const title = basename(file).replace(/\.(pdf|jpg|jpeg|png)$/i, "").trim();
  const out = join(outDir, `${slugify(title)}.md`);
  if (existsSync(out)) return console.log("skip (exists)", out);
  const isImage = /\.(jpg|jpeg|png)$/i.test(file);
  const body = isImage ? "TODO: transcribe this image." : pdfText(join(srcDir, file));
  writeFileSync(out, `---\ntitle: ${JSON.stringify(title)}\nsource: ${JSON.stringify(file)}\n---\n\n${body}\n`);
  console.log(isImage ? "IMAGE (needs transcription)" : "wrote", out);
}

for (const [slug, dir] of Object.entries(FILMS)) {
  const srcDir = join(SRC, dir);
  const outDir = join(CONTENT, "films", slug, "knowledge");
  mkdirSync(outDir, { recursive: true });
  for (const file of readdirSync(srcDir).filter((f) => !f.startsWith(".")).sort()) writeDoc(outDir, file, srcDir);
}

// Shared frameworks, used by the MORAL Coach.
const coachDir = join(SRC, "Clever Minds", "MORAL Coach Knowledge");
mkdirSync(join(CONTENT, "shared"), { recursive: true });
for (const [file, name] of [
  ["Novastone Learning MORAL Ethical Dilemma Framework - August 2024.pdf", "moral-framework"],
  ["Framework for Character Education-2.pdf", "character-education-framework"],
]) {
  const out = join(CONTENT, "shared", `${name}.md`);
  if (existsSync(out)) { console.log("skip (exists)", out); continue; }
  writeFileSync(out, `---\ntitle: ${JSON.stringify(file.replace(/\.pdf$/, ""))}\nsource: ${JSON.stringify(file)}\n---\n\n${pdfText(join(coachDir, file))}\n`);
  console.log("wrote", out);
}
