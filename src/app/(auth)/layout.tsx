import { CoBrandHeader } from "@/components/CoBrandHeader";

// Pared-back chrome for sign-in: the landing header's anchor links would lead
// nowhere from here, so this carries only the mark and a way home. A school's
// own entry page shows its logo on the card instead of in this header.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-ink-900">
      <CoBrandHeader />
      <main className="flex flex-1 items-start justify-center px-4 py-14 sm:px-8 sm:py-[88px]">
        <div className="w-full max-w-[460px] rounded-[22px] border border-hairline bg-ink-700 px-6 py-9 sm:px-10 sm:py-11">
          {children}
        </div>
      </main>
    </div>
  );
}
