import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import { CoBrandHeader } from "@/components/CoBrandHeader";
import { currentSchool } from "@/lib/school";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your library | Novastone Learning" };

// Deliberately minimal until phase 3 builds the real library. Every query runs
// with the signed-in user's own JWT, so what renders is exactly what RLS lets
// through — which makes this page the place to prove two schools see
// different films.
export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const claims = auth?.claims;
  if (!claims) redirect("/login?next=/library");

  const [school, { data: entitled }, { data: withCast }] = await Promise.all([
    currentSchool(supabase),
    supabase.from("entitlements").select("films(id, slug, title, runtime_min, sort_order)"),
    // Films that have characters to talk to (RLS limits this to licensed films).
    supabase.from("characters").select("film_id"),
  ]);

  const films = (entitled ?? [])
    .flatMap((e) => (e.films ? [e.films].flat() : []))
    .sort((a, b) => a.sort_order - b.sort_order);
  const chatFilms = new Set((withCast ?? []).map((c) => c.film_id));
  const role = (claims.app_metadata as { role?: string } | undefined)?.role ?? "student";

  return (
    <div className="min-h-screen bg-ink-900">
      <CoBrandHeader school={school} homeHref="/library">
        <form action={signOut}>
          <button type="submit" className="btn-outline h-9 w-9 text-sm sm:h-auto sm:w-auto sm:px-[18px] sm:py-2.5">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:hidden" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            <span className="max-sm:sr-only">Sign out</span>
          </button>
        </form>
      </CoBrandHeader>

      <main className="mx-auto max-w-[1180px] px-4 py-14 sm:px-8">
        <p className="eyebrow mb-3 text-brass-500">Your library</p>
        <h1 className="mb-3 text-[clamp(28px,3.4vw,42px)] font-bold leading-[1.08] tracking-[-0.03em]">
          {films.length} {films.length === 1 ? "film" : "films"} licensed
        </h1>
        <p className="mb-8 text-sm text-paper-500">
          Signed in as {claims.email as string} · {role}
        </p>
        {films.length === 0 ? (
          <p className="text-paper-500">
            No films are available to your school right now. If that seems wrong, your school&apos;s term may have ended.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {films.map((f) => (
              <li key={f.slug} className="flex items-center justify-between gap-4 rounded-xl border border-hairline bg-ink-700 px-5 py-4">
                <span>
                  <span className="font-semibold">{f.title}</span>
                  {f.runtime_min && <span className="ml-2 text-sm text-paper-500">{f.runtime_min} min</span>}
                </span>
                {chatFilms.has(f.id) && (
                  <Link href={`/films/${f.slug}/talk`} className="shrink-0 text-sm font-semibold text-gold-500 hover:text-gold-400">
                    Talk to the characters
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
