"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Film } from "@/content/site";

export function FilmGrid({ films }: { films: Film[] }) {
  const [openFilm, setOpenFilm] = useState<Film | null>(null);

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-[26px]">
        {films.map((film) => (
          <article
            key={film.id}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-paper-100/10 bg-ink-700 transition-colors focus-within:border-gold-500/55 hover:border-gold-500/55"
          >
            <div className="relative aspect-video">
              <Image
                src={film.poster}
                alt=""
                fill
                sizes="(min-width: 1180px) 380px, (min-width: 700px) 50vw, 100vw"
                className="object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(11,7,19,0)_45%,rgba(11,7,19,0.85)_100%)]" />
              {/* The pill's ::after stretches over the whole card so the entire card opens the trailer. */}
              <button
                type="button"
                onClick={() => setOpenFilm(film)}
                aria-label={`Play trailer: ${film.title}`}
                className="btn-gold absolute bottom-3.5 left-4 gap-2.5 py-[9px] pl-3 pr-4 text-[13px] after:absolute after:inset-[-400px] after:content-[''] group-hover:bg-gold-400"
              >
                <PlayIcon className="h-2.5 w-2.5" />
                <span>{film.trailerRuntime ? `Trailer · ${film.trailerRuntime}` : "Trailer coming soon"}</span>
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-2.5 px-[22px] pb-[26px] pt-[22px]">
              <span className="font-serif text-[11.5px] uppercase tracking-[0.2em] text-brass-500">{film.theme}</span>
              <h3 className="text-[22px] font-bold leading-[1.15] tracking-[-0.02em]">{film.title}</h3>
              <p className="text-[14.5px] leading-[1.55] text-paper-500">{film.logline}</p>
            </div>
          </article>
        ))}
      </div>

      <TrailerModal film={openFilm} onClose={() => setOpenFilm(null)} />
    </>
  );
}

function TrailerModal({ film, onClose }: { film: Film | null; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Native <dialog> + showModal() provides Esc-to-close, focus trapping,
  // aria-modal semantics, and focus return to the trigger.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (film && !dialog.open) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
    } else if (!film && dialog.open) {
      dialog.close();
    }
  }, [film]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="trailer-title"
      onClose={() => {
        document.body.style.overflow = "";
        onClose();
      }}
      // Clicks on the backdrop land on the <dialog> element itself.
      onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
      className="m-auto w-[min(920px,calc(100%-32px))] max-w-none overflow-hidden rounded-[18px] border border-paper-100/16 bg-ink-700 p-0 text-paper-100 backdrop:bg-[rgba(6,4,11,0.88)] backdrop:backdrop-blur-[8px]"
    >
      {film && (
        <>
          <div className="relative grid aspect-video place-items-center bg-[#08050E]">
            {film.trailerVimeoId ? (
              <iframe
                src={`https://player.vimeo.com/video/${film.trailerVimeoId}?autoplay=1&dnt=1`}
                title={`${film.title} trailer`}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            ) : (
              <div className="flex flex-col items-center gap-3.5 text-paper-500">
                <span className="grid h-[72px] w-[72px] place-items-center rounded-full bg-gold-500 text-plum-600">
                  <PlayIcon className="ml-1 h-6 w-6" />
                </span>
                <span className="text-[13.5px] uppercase tracking-[0.14em]">Trailer coming soon</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-end justify-between gap-5 px-[30px] pb-[30px] pt-[26px]">
            <div>
              <span className="font-serif text-[11.5px] uppercase tracking-[0.2em] text-brass-500">{film.theme}</span>
              <h3 id="trailer-title" className="my-2 text-[26px] font-bold tracking-[-0.02em]">
                {film.title}
              </h3>
              <p className="max-w-[54ch] text-[15px] leading-[1.55] text-paper-500">{film.logline}</p>
            </div>
            <button type="button" onClick={() => dialogRef.current?.close()} className="btn-outline px-6 py-[13px] text-sm" autoFocus>
              Close
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 14" className={className} fill="currentColor" aria-hidden="true">
      <path d="M0 0l12 7-12 7z" />
    </svg>
  );
}
