"use client";

import { useEffect, useState } from "react";
import { NovastoneMark } from "@/components/Logo";
import { nav, requestAccessHref } from "@/content/site";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-60 border-b border-hairline bg-plum-700/82 backdrop-blur-[14px]">
      <div className="flex items-center justify-between gap-6 px-4 py-[18px] sm:px-8 lg:py-[26px]">
        <a href="#top" className="flex items-center gap-3 text-paper-100 hover:text-paper-100">
          <NovastoneMark className="h-10 w-10 shrink-0 text-gold-500" />
          <span className="flex flex-col leading-[1.15]">
            <span className="text-sm font-semibold tracking-[0.14em]">Novastone Learning</span>
            <span className="font-serif text-[11.5px] uppercase tracking-[0.14em] text-brass-300">
              Leadership Film Series
            </span>
          </span>
        </a>

        <nav
          aria-label="Primary"
          className="hidden flex-wrap items-center justify-end gap-x-[22px] gap-y-3 whitespace-nowrap text-sm font-medium lg:flex"
        >
          {nav.map((item) => (
            <a key={item.label} href={item.href} className="text-paper-300 transition-colors hover:text-gold-400">
              {item.label}
            </a>
          ))}
          <a href={requestAccessHref} className="btn-gold px-[18px] py-2.5">
            Request Access
          </a>
        </nav>

        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-full border border-paper-100/30 text-paper-100 lg:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav id="mobile-nav" aria-label="Primary" className="border-t border-hairline px-4 pb-6 pt-2 sm:px-8 lg:hidden">
          <ul className="flex flex-col">
            {nav.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="block border-b border-hairline py-4 text-base font-medium text-paper-300 hover:text-gold-400"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <a href={requestAccessHref} onClick={() => setMenuOpen(false)} className="btn-gold mt-5 w-full px-6 py-3.5 text-[15px]">
            Request Access
          </a>
        </nav>
      )}
    </header>
  );
}
