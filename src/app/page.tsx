import Image from "next/image";
import { FilmGrid } from "@/components/FilmGrid";
import { NovastoneMark } from "@/components/Logo";
import { SeriesCarousel } from "@/components/SeriesCarousel";
import { SiteHeader } from "@/components/SiteHeader";
import { facultyQuote, films, requestAccessHref, slides, stats } from "@/content/site";

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />

        <section id="approach" className="bg-ink-700 px-4 py-[104px] sm:px-8">
          <div className="mx-auto max-w-[1180px]">
            <SeriesCarousel slides={slides} />
          </div>
        </section>

        <section id="films" className="bg-ink-900 px-4 py-[104px] sm:px-8">
          <div className="mx-auto max-w-[1180px]">
            <div className="mb-11 flex flex-wrap items-end justify-between gap-8">
              <div>
                <p className="eyebrow mb-3.5 text-brass-500">The Films</p>
                <h2 className="max-w-[20ch] text-[clamp(32px,4vw,52px)] font-bold leading-[1.05] tracking-[-0.03em]">
                  Ten decisions with no clean answer
                </h2>
              </div>
              <p className="max-w-[38ch] text-base leading-[1.6] text-paper-500">
                Every film runs 10–13 minutes and ends with no clear choice. The discussion starts where the credits roll.
              </p>
            </div>
            <FilmGrid films={films} />
          </div>
        </section>

        <AiSection />

        <section id="adopt" className="bg-ink-900 px-4 py-[104px] sm:px-8">
          <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-10 rounded-[22px] border border-gold-500/35 bg-ink-700 px-6 py-10 sm:px-12 sm:py-14">
            <div>
              <h2 className="max-w-[22ch] text-[clamp(28px,3.4vw,42px)] font-bold leading-[1.08] tracking-[-0.03em]">
                Screen the series in your graduate leadership course
              </h2>
              <p className="mt-[18px] max-w-[52ch] text-[16.5px] leading-[1.6] text-paper-500">
                Institutional licenses include all ten films, facilitation guides, discussion protocols and AI character
                access for every enrolled student.
              </p>
            </div>
            <a href={requestAccessHref} className="btn-gold whitespace-nowrap px-8 py-[17px] text-base">
              Request faculty access
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline bg-ink-900 px-4 py-11 sm:px-8">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-5 text-[13.5px] text-paper-600">
          <div className="flex items-center gap-4">
            <NovastoneMark className="h-8 w-8 text-paper-600" />
            <span>© 2026 Novastone Learning, LLC</span>
          </div>
          <nav aria-label="Footer" className="flex gap-[26px]">
            <a href="#adopt" className="text-paper-600 hover:text-gold-400">Contact</a>
            <a href="#films" className="text-paper-600 hover:text-gold-400">Films</a>
            <a href="#approach" className="text-paper-600 hover:text-gold-400">Approach</a>
          </nav>
        </div>
      </footer>
    </>
  );
}

function Hero() {
  return (
    <section id="top" className="relative isolate bg-ink-900">
      {/* a. Copy band. Kept separate from the photo so the headline never covers faces. */}
      <div className="relative z-2 mx-auto max-w-[1180px] bg-plum-700 px-4 pb-14 pt-14 sm:px-8 sm:pt-[72px]">
        <p className="mb-5 font-serif text-[13px] uppercase tracking-[0.28em] text-gold-500">
          Graduate Programs in Educational Leadership
        </p>
        <h1 className="max-w-[24ch] text-balance text-[clamp(40px,5.6vw,86px)] font-bold leading-[0.97] tracking-[-0.03em]">
          Leadership Training Meets Cinematic Storytelling
        </h1>
        <p className="mt-[26px] max-w-[58ch] text-[clamp(16px,1.5vw,20px)] leading-[1.55] text-paper-300">
          Short films that drop your students into the gray area of school leadership — where the policy runs out and the
          judgment begins. Then let them question the characters themselves.
        </p>
        <div className="mt-[34px] flex flex-wrap gap-3.5">
          <a href="#films" className="btn-gold px-7 py-[15px] text-[15px]">Watch the trailers</a>
          <a href="#adopt" className="btn-outline px-7 py-[15px] text-[15px]">Bring it to your course</a>
        </div>
      </div>

      {/* b. Photo band with scrims that melt into the dark bands above and below. */}
      <div className="relative z-1 h-[clamp(360px,52vh,620px)]">
        <Image
          src="/images/hero-classroom.jpg"
          alt="Graduate students in an educational leadership seminar discuss equity with their professor"
          fill
          preload
          sizes="100vw"
          className="object-cover object-[center_22%]"
        />
        <div className="absolute inset-x-0 top-0 h-[140px] bg-linear-to-b from-ink-900 via-ink-900/55 via-45% to-ink-900/0" />
        <div className="absolute inset-x-0 bottom-0 h-[180px] bg-linear-to-b from-ink-900/0 via-ink-900/90 via-72% to-ink-900" />
      </div>

      {/* c. Stat row */}
      <div className="relative z-2 mx-auto max-w-[1180px] px-4 pb-[72px] sm:px-8">
        <dl className="flex flex-wrap gap-x-11 gap-y-6 border-t border-paper-100/16 pt-[30px]">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse gap-1">
              <dt className="text-[13px] uppercase tracking-[0.1em] text-paper-500">{stat.label}</dt>
              <dd className="text-[30px] font-bold tracking-[-0.03em] text-gold-500">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function AiSection() {
  return (
    <section id="ai" className="bg-linear-to-b from-ink-700 to-ink-500 px-4 py-[104px] sm:px-8">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-[clamp(36px,5vw,64px)]">
        <div className="min-w-0 flex-[1_1_380px]">
          <p className="eyebrow mb-3.5 text-gold-500">Interview the Characters</p>
          <h2 className="text-[clamp(32px,4vw,52px)] font-bold leading-[1.05] tracking-[-0.03em]">
            Ask the principal why she did it
          </h2>
          <p className="mt-6 max-w-[50ch] text-[17px] leading-[1.62] text-paper-400">
            After the screening, students open a conversation with any character in the film. Every character holds their own
            knowledge, motives and blind spots — so students have to probe, listen, and reckon with a point of view they were
            ready to judge.
          </p>
          <figure className="mt-5">
            <blockquote className="max-w-[50ch] font-serif text-lg italic leading-[1.6] text-paper-200">
              “{facultyQuote.text}”
            </blockquote>
            <figcaption className="mt-2.5 text-[13px] uppercase tracking-[0.1em] text-brass-500">
              {facultyQuote.attribution}
            </figcaption>
          </figure>
        </div>

        {/* A static picture of the chat product, not the product itself. */}
        <div
          aria-label="Example conversation with a film character"
          role="img"
          className="flex min-w-0 flex-[1_1_340px] flex-col gap-4 rounded-[18px] border border-paper-100/14 bg-ink-800 p-[26px]"
        >
          <div className="flex items-center gap-3 border-b border-hairline pb-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brass-500/25 text-sm font-semibold text-brass-500">
              RA
            </div>
            <div className="flex flex-col leading-[1.3]">
              <span className="text-[15px] font-semibold">Dr. Renée Alvarado</span>
              <span className="text-[12.5px] text-paper-500">
                Principal · <em>The Quiet Recommendation</em>
              </span>
            </div>
          </div>
          <div className="max-w-[84%] self-end rounded-[16px_16px_4px_16px] bg-gold-500 px-[17px] py-[13px] text-[14.5px] leading-normal text-plum-600">
            You knew the transfer would hurt that school. Why sign it?
          </div>
          <div className="max-w-[88%] self-start rounded-[16px_16px_16px_4px] bg-ink-500 px-[17px] py-[13px] text-[14.5px] leading-normal text-paper-200">
            Because the alternative was a two-year investigation with a child in the middle of it. I&apos;m not asking you to
            call it right. I&apos;m asking what you&apos;d have signed at 9 p.m. on a Friday.
          </div>
          <div className="flex flex-wrap gap-2 pt-1.5">
            {["Who else knew?", "What did policy require?"].map((chip) => (
              <span key={chip} className="rounded-full border border-paper-100/25 px-3.5 py-2 text-[13px] text-paper-400">
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
