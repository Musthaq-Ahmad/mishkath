"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { login } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="email"
          className="ml-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
        >
          Administrator Email
        </label>
        <div className="relative">
          <span className="material-symbols-outlined pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[20px] text-outline">
            mail
          </span>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="e.g. curator@mishkat.org"
            required
            className="w-full rounded-lg border border-border bg-background py-4 pr-4 pl-12 text-sm transition-all duration-200 ease-out outline-none placeholder:text-outline/50 focus:border-primary focus:ring-3 focus:ring-primary/10"
          />
        </div>
        {state?.errors?.email && (
          <p className="text-sm text-destructive">{state.errors.email[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="password"
          className="ml-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
        >
          Secure Password
        </label>
        <div className="relative">
          <span className="material-symbols-outlined pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[20px] text-outline">
            lock
          </span>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            required
            className="w-full rounded-lg border border-border bg-background py-4 pr-12 pl-12 text-sm transition-all duration-200 ease-out outline-none placeholder:text-outline/50 focus:border-primary focus:ring-3 focus:ring-primary/10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute top-1/2 right-4 -translate-y-1/2 text-outline transition-colors hover:text-primary"
          >
            <span className="material-symbols-outlined text-[20px]">
              {showPassword ? "visibility_off" : "visibility"}
            </span>
          </button>
        </div>
        {state?.errors?.password && (
          <p className="text-sm text-destructive">{state.errors.password[0]}</p>
        )}
      </div>

      {state?.message && <p className="text-sm text-destructive">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-3 rounded-lg bg-primary py-4 font-heading text-lg font-semibold text-primary-foreground shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
      >
        {pending ? "Signing in..." : "Sign In"}
        <span className="material-symbols-outlined">arrow_forward</span>
      </button>

      <div className="mt-4 border-t border-border pt-6 text-center">
        <p className="mb-3 text-sm text-muted-foreground">
          New to the festival committee?
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-primary uppercase transition-colors hover:text-primary/80"
        >
          Request Access
          <span className="material-symbols-outlined text-[16px]">
            trending_flat
          </span>
        </Link>
      </div>
    </form>
  );
}
