// Landing page content. Copy comes from the Claude Design handoff unless noted.
// Entries marked `placeholder: true` are stand-ins that must be replaced before launch.

export const requestAccessHref = "#adopt"; // TODO: point to the Request Access form once it exists.

export const nav = [
  { label: "Our Approach", href: "#approach" },
  { label: "The Films", href: "#films" },
  { label: "Talk to Characters", href: "#ai" },
  { label: "For Faculty", href: "#adopt" },
];

export const stats = [
  { value: "10", label: "Films in the series" },
  { value: "18", label: "AI characters to interview" }, // TODO: confirm count against real character rosters.
  { value: "14-day", label: "Free faculty trial" }, // From Brand Notes; fills the empty third slot.
];

export type Slide = {
  id: string;
  kicker: string;
  headline: string;
  body: string;
  points: string[];
  image: string;
  imageAlt: string;
};

// Slide copy is final per the handoff. Images are one shared placeholder for now.
export const slides: Slide[] = [
  {
    id: "what",
    kicker: "What We Do",
    headline: "We film the gray area, students navigate to the decision.",
    body: "Original short films built with school leaders and dramatized from real cases — each one ending at the moment a leader has to make a tough choice.",
    points: [
      "Ten films 10 - 13 minute each, classroom-ready",
      "Written from documented leadership dilemmas",
      "No narrator, no answer key, no tidy ending",
    ],
    image: "/images/series-placeholder.jpg",
    imageAlt: "", // TODO: production still
  },
  {
    id: "who",
    kicker: "Who We Are",
    headline: "Filmmakers and school leaders in the same room",
    body: "A collaboration between Lipscomb's College of Education and a working production team, with sitting superintendents and principals reviewing every script.",
    points: [
      "Faculty in educational leadership as story editors",
      "Practicing administrators as case advisors",
      "Professional cast and crew",
    ],
    image: "/images/series-placeholder.jpg",
    imageAlt: "", // TODO: behind-the-scenes photo
  },
  {
    id: "how",
    kicker: "How It Works",
    headline: "Screen, interrogate, deliberate",
    body: "Students watch in class or before it, then open a conversation with any character in the film. The transcript of that conversation becomes the raw material for discussion.",
    points: [
      "Screen the film — one class session",
      "Students interview characters one-on-one",
      "Debrief with the facilitation protocol",
    ],
    image: "/images/series-placeholder.jpg",
    imageAlt: "", // TODO: classroom discussion photo
  },
  {
    id: "why",
    kicker: "Why It Works",
    headline: "Judgment is learned under pressure, not on paper",
    body: "A case study is read at arm's length. A film is lived, and a character who answers back refuses to stay a hypothetical — students leave having defended a position to the person it affects.",
    points: [
      "Empathy before evaluation",
      "Positions students must actually defend",
      "Aligned to leadership standards and ethics coursework",
    ],
    image: "/images/series-placeholder.jpg",
    imageAlt: "", // TODO: seminar photo
  },
];

export type Film = {
  id: string;
  title: string;
  theme: string;
  /** Trailer length shown on the card; omitted until the trailer exists. */
  trailerRuntime?: string;
  logline: string;
  poster: string;
  /** Vimeo video ID for the trailer; the modal shows a "coming soon" state without it. */
  trailerVimeoId?: string;
  placeholder?: boolean;
};

const poster = "/images/film-placeholder.jpg";

// All ten entries are placeholders: titles, loglines, themes and runtimes were invented for the design.
export const films: Film[] = [
  { id: "quiet", title: "The Quiet Recommendation", theme: "Personnel · Reporting", trailerRuntime: "2:14", poster, placeholder: true,
    logline: "A principal can end a misconduct case tonight with one signature — and send the problem to another district." },
  { id: "room214", title: "Room 214", theme: "Student Safety", trailerRuntime: "1:58", poster, placeholder: true,
    logline: "A first-year teacher reports something she thinks she saw. Her department chair thinks she is wrong." },
  { id: "margin", title: "Margin of Error", theme: "Data · Accountability", trailerRuntime: "2:31", poster, placeholder: true,
    logline: "The growth numbers are real. The way they were produced is not something the superintendent wants explained." },
  { id: "afterbell", title: "After the Bell", theme: "Discipline · Equity", trailerRuntime: "2:05", poster, placeholder: true,
    logline: "Two students, the same fight, two families with very different capacity to push back." },
  { id: "waitlist", title: "The Waiting List", theme: "Special Education", trailerRuntime: "1:47", poster, placeholder: true,
    logline: "An evaluation delayed by staffing becomes a legal exposure — and a child's lost year." },
  { id: "signatures", title: "Two Signatures", theme: "Budget · Ethics", trailerRuntime: "2:22", poster, placeholder: true,
    logline: "A vendor contract that saves the district money was negotiated by a board member's brother-in-law." },
  { id: "film-7", title: "Film Seven", theme: "Theme to come", poster, placeholder: true,
    logline: "Logline to come." },
  { id: "film-8", title: "Film Eight", theme: "Theme to come", poster, placeholder: true,
    logline: "Logline to come." },
  { id: "film-9", title: "Film Nine", theme: "Theme to come", poster, placeholder: true,
    logline: "Logline to come." },
  { id: "film-10", title: "Film Ten", theme: "Theme to come", poster, placeholder: true,
    logline: "Logline to come." },
];

// Real testimonial from the Novastone Brand Notes, replacing the design's placeholder quote.
export const facultyQuote = {
  text: "Screening Clever Minds in my class led to really deep discussions. The film was powerful and stirred a lot of emotion in the students in the class.",
  attribution: "Dr. Robin Cayce, Assistant Professor, Lipscomb University",
};
