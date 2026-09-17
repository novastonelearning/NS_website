"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { Slide } from "@/content/site";

const SWIPE_THRESHOLD_PX = 50;

export function SeriesCarousel({ slides }: { slides: Slide[] }) {
  const [active, setActive] = useState(0);
  const pointerStartX = useRef<number | null>(null);

  // Wraps in both directions, matching the prototype's (n + len) % len. Uses the
  // updater form so rapid clicks each advance from the latest index.
  const step = (delta: number) => setActive((i) => (i + delta + slides.length) % slides.length);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="About the series"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") step(-1);
        if (e.key === "ArrowRight") step(1);
      }}
    >
      <div className="mb-11 flex flex-wrap items-end justify-between gap-8">
        <div>
          <p className="eyebrow mb-3.5 text-brass-500">The Series</p>
          <h2 aria-live="polite" className="text-[clamp(32px,4vw,52px)] font-bold leading-[1.05] tracking-[-0.03em]">
            {slides[active].kicker}
          </h2>
        </div>
        <div className="flex gap-3">
          <ArrowButton label="Previous" onClick={() => step(-1)} direction="left" />
          <ArrowButton label="Next" onClick={() => step(1)} direction="right" />
        </div>
      </div>

      <div
        className="touch-pan-y overflow-hidden rounded-[20px]"
        onPointerDown={(e) => (pointerStartX.current = e.clientX)}
        onPointerUp={(e) => {
          if (pointerStartX.current === null) return;
          const dx = e.clientX - pointerStartX.current;
          pointerStartX.current = null;
          if (Math.abs(dx) > SWIPE_THRESHOLD_PX) step(dx < 0 ? 1 : -1);
        }}
      >
        <div
          className="flex w-full transition-transform duration-[520ms] ease-reveal motion-reduce:transition-none"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <article
              key={slide.id}
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${slides.length}`}
              aria-hidden={i !== active}
              inert={i !== active}
              className="flex flex-[0_0_100%] flex-wrap overflow-hidden rounded-[20px] border border-paper-100/10 bg-ink-600"
            >
              <div className="flex min-w-0 flex-[1_1_380px] flex-col justify-center gap-[22px] p-[clamp(28px,4vw,52px)]">
                <span className="font-serif text-xs uppercase tracking-[0.26em] text-gold-500">{slide.kicker}</span>
                <h3 className="text-[clamp(26px,2.6vw,38px)] font-bold leading-[1.1] tracking-[-0.025em]">{slide.headline}</h3>
                <p className="max-w-[48ch] text-[17px] leading-[1.62] text-paper-400">{slide.body}</p>
                <ul className="mt-1.5 flex flex-col gap-3">
                  {slide.points.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-[15px] leading-normal text-paper-200">
                      <span className="mt-[7px] h-[7px] w-[7px] shrink-0 rounded-full bg-brass-500" aria-hidden="true" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative min-h-80 min-w-0 flex-[1_1_320px] border-paper-100/10 sm:border-l">
                <Image
                  src={slide.image}
                  alt={slide.imageAlt}
                  fill
                  sizes="(min-width: 1180px) 560px, (min-width: 700px) 50vw, 100vw"
                  className="object-cover"
                  draggable={false}
                />
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-[26px] flex gap-2.5">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            aria-label={slide.kicker}
            aria-current={i === active}
            onClick={() => setActive(i)}
            className={`h-1 rounded-full transition-all duration-300 motion-reduce:transition-none ${
              i === active ? "w-14 bg-gold-500" : "w-6 bg-paper-100/28 hover:bg-paper-100/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function ArrowButton({ label, onClick, direction }: { label: string; onClick: () => void; direction: "left" | "right" }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-[52px] w-[52px] place-items-center rounded-full border border-paper-100/30 text-paper-100 transition-colors hover:border-gold-500 hover:text-gold-500"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {direction === "left" ? <path d="M19 12H5m6-6-6 6 6 6" /> : <path d="M5 12h14m-6-6 6 6-6 6" />}
      </svg>
    </button>
  );
}
