import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/AuthForms";
import { safeNext } from "@/lib/auth/shared";

export const metadata: Metadata = { title: "Sign in | Novastone Learning" };

const notices: Record<string, string> = {
  link: "That sign-in link has expired or was already used. Request a new one below.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  return (
    <>
      <p className="eyebrow mb-3 text-brass-500">Welcome back</p>
      <h1 className="mb-8 text-[32px] font-bold leading-[1.1] tracking-[-0.03em]">Sign in</h1>
      <LoginForm
        next={typeof next === "string" ? safeNext(next) : undefined}
        notice={typeof error === "string" ? notices[error] : undefined}
      />
    </>
  );
}
