import Link from "next/link";
import type { ReactNode } from "react";
import { NovastoneMark } from "@/components/Logo";

/** The subscribing school, as shown next to Novastone in the header. */
export type School = { name: string; shortName: string | null; logoUrl: string | null };

// One header for every signed-in and sign-in page. Novastone always comes
// first; a school gets its name and (white) logo after the divider, never its
// own colors. On phones the lockup shortens to "Novastone | <short name>".
export function CoBrandHeader({
  school,
  homeHref = "/",
  className = "",
  children,
}: {
  school?: School | null;
  homeHref?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <header className={`border-b border-hairline bg-plum-700 px-4 py-3.5 sm:px-8 sm:py-[18px] ${className}`}>
      <div className="flex items-center gap-2.5 sm:gap-4">
        <Link href={homeHref} className="flex shrink-0 items-center gap-2.5 text-paper-100 hover:text-paper-100 sm:gap-3">
          <NovastoneMark className="h-8 w-8 shrink-0 text-gold-500 sm:h-10 sm:w-10" />
          <span className={`flex-col leading-[1.15] ${school ? "hidden sm:flex" : "flex"}`}>
            <span className="text-sm font-semibold tracking-[0.14em]">Novastone Learning</span>
            <span className="font-serif text-[11.5px] uppercase tracking-[0.14em] text-brass-300">Leadership Film Series</span>
          </span>
          {school && <span className="text-[13px] font-semibold tracking-[0.06em] sm:hidden">Novastone</span>}
        </Link>

        {school && (
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="h-6 w-px shrink-0 bg-paper-100/30 sm:h-8" aria-hidden="true" />
            {school.logoUrl && (
              // Logos live in Supabase Storage at whatever aspect ratio the school
              // sent, so a plain <img> sized by height suits better than next/image.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={school.logoUrl} alt="" className="h-6 w-auto max-w-[56px] shrink-0 object-contain sm:h-8 sm:max-w-[120px]" />
            )}
            <span className="hidden truncate text-sm font-semibold sm:inline">{school.name}</span>
            <span className="truncate text-[13px] font-semibold sm:hidden">{school.shortName ?? school.name}</span>
          </div>
        )}

        {children && <div className="ml-auto flex shrink-0 items-center gap-2.5 sm:gap-3">{children}</div>}
      </div>
    </header>
  );
}
