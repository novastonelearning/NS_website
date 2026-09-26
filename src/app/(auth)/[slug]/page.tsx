import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RedeemForm } from "@/components/auth/AuthForms";
import { institutionBySlug } from "@/lib/auth/institution";

// Branded entry at novastonelearning.com/<slug>. Static routes such as /films
// resolve first; the reserved_slugs trigger stops a school ever claiming one.
// Unknown, expired and suspended schools all 404 alike, so the URL reveals
// nothing about who has or had a licence.
export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const institution = await institutionBySlug((await params).slug);
  return { title: institution ? `${institution.name} | Novastone Learning` : "Not found" };
}

export default async function InstitutionEntryPage({ params }: PageProps<"/[slug]">) {
  const institution = await institutionBySlug((await params).slug);
  if (!institution) notFound();

  return (
    <>
      {institution.logo_url && (
        // Schools send a white logo, which suits this dark card. Plain <img>
        // because logos arrive at any aspect ratio.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={institution.logo_url} alt="" className="mb-6 h-12 w-auto max-w-[220px] object-contain" />
      )}
      <p className="eyebrow mb-3 text-brass-500">Leadership Film Series</p>
      <h1 className="mb-3 text-[32px] font-bold leading-[1.1] tracking-[-0.03em]">{institution.name}</h1>
      <p className="mb-8 text-[15.5px] leading-[1.6] text-paper-500">
        Enter the access code from your instructor and your {institution.name} email address.
      </p>
      <RedeemForm />
    </>
  );
}
