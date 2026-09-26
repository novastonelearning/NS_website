import type { Metadata } from "next";
import { RedeemForm } from "@/components/auth/AuthForms";
import { redeemErrors } from "@/lib/auth/shared";

export const metadata: Metadata = { title: "Redeem an access code | Novastone Learning" };

export default async function RedeemPage({ searchParams }: PageProps<"/redeem">) {
  const { error } = await searchParams;
  return (
    <>
      <p className="eyebrow mb-3 text-brass-500">Join your class</p>
      <h1 className="mb-3 text-[32px] font-bold leading-[1.1] tracking-[-0.03em]">Redeem an access code</h1>
      <p className="mb-8 text-[15.5px] leading-[1.6] text-paper-500">
        Your instructor or program has a code for your school. Use your school email so we can match you to it.
      </p>
      <RedeemForm notice={typeof error === "string" ? redeemErrors[error] : undefined} />
    </>
  );
}
