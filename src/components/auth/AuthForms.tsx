"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestLoginLink, requestRedeemLink, type FormState } from "@/app/(auth)/actions";

const initial: FormState = { status: "idle" };

const inputClass =
  "w-full rounded-xl border border-paper-100/20 bg-ink-900 px-4 py-3 text-[15px] text-paper-100 placeholder:text-paper-600 focus:border-gold-500 focus:outline-none";
const labelClass = "mb-2 block text-sm font-medium text-paper-300";

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action, pending] = useActionState(requestLoginLink, initial);
  const typed = state.status === "error" ? state.values : {};
  if (state.status === "sent") return <CheckInbox email={state.email} />;

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <Message text={state.status === "error" ? state.message : notice} />
      <div>
        <label htmlFor="email" className={labelClass}>School email</label>
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue={typed.email} className={inputClass} />
      </div>
      <button type="submit" disabled={pending} className="btn-gold mt-1 px-6 py-3.5 text-[15px] disabled:opacity-60">
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
      <p className="text-sm text-paper-500">
        First time here?{" "}
        <Link href="/redeem" className="text-gold-500 hover:text-gold-400">Redeem an access code</Link>
      </p>
    </form>
  );
}

export function RedeemForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState(requestRedeemLink, initial);
  const typed = state.status === "error" ? state.values : {};
  if (state.status === "sent") return <CheckInbox email={state.email} />;

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <Message text={state.status === "error" ? state.message : notice} />
      <div>
        <label htmlFor="code" className={labelClass}>Access code</label>
        <input
          id="code"
          name="code"
          defaultValue={typed.code}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required
          className={`${inputClass} uppercase tracking-[0.12em]`}
        />
      </div>
      <div>
        <label htmlFor="email" className={labelClass}>School email</label>
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue={typed.email} className={inputClass} />
      </div>
      <fieldset>
        <legend className={labelClass}>I am</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["student", "faculty"] as const).map((role) => (
            <label
              key={role}
              className="flex cursor-pointer items-center justify-center rounded-xl border border-paper-100/20 px-4 py-3 text-[15px] text-paper-300 has-checked:border-gold-500 has-checked:text-gold-500 has-focus-visible:outline-2 has-focus-visible:outline-gold-500"
            >
              <input type="radio" name="role" value={role} defaultChecked={role === (typed.role === "faculty" ? "faculty" : "student")} className="sr-only" />
              {role === "student" ? "A student" : "Faculty"}
            </label>
          ))}
        </div>
      </fieldset>
      <button type="submit" disabled={pending} className="btn-gold mt-1 px-6 py-3.5 text-[15px] disabled:opacity-60">
        {pending ? "Checking…" : "Continue"}
      </button>
      <p className="text-sm text-paper-500">
        Already joined?{" "}
        <Link href="/login" className="text-gold-500 hover:text-gold-400">Sign in</Link>
      </p>
    </form>
  );
}

function Message({ text }: { text?: string }) {
  return (
    <p role="alert" aria-live="polite" className={text ? "rounded-xl border border-gold-500/40 bg-gold-500/10 px-4 py-3 text-sm leading-[1.5] text-paper-200" : "sr-only"}>
      {text}
    </p>
  );
}

function CheckInbox({ email }: { email: string }) {
  return (
    <div role="status" className="flex flex-col gap-3">
      <p className="eyebrow text-brass-500">Check your inbox</p>
      <p className="text-[16.5px] leading-[1.6] text-paper-300">
        We sent a sign-in link to <strong className="text-paper-100">{email}</strong>. Open it on this device to finish
        signing in. It expires in an hour.
      </p>
      <p className="text-sm text-paper-500">
        If you don&apos;t see it within a few minutes, check your spam folder.
      </p>
    </div>
  );
}
