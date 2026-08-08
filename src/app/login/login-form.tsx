"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { login } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email" className="ml-0.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Administrator Email
        </Label>
        <div className="relative">
          <span className="material-symbols-outlined pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[20px] text-muted-foreground">
            mail
          </span>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="e.g. curator@mishkat.org"
            required
            className="h-12 pl-11"
          />
        </div>
        {state?.errors?.email && (
          <p className="text-sm text-destructive">{state.errors.email[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password" className="ml-0.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Secure Password
        </Label>
        <div className="relative">
          <span className="material-symbols-outlined pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[20px] text-muted-foreground">
            lock
          </span>
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            required
            className="h-12 pr-11 pl-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
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

      <Button type="submit" disabled={pending} size="lg" className="h-12 w-full gap-2 text-base">
        {pending ? "Signing in..." : "Sign In"}
        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
      </Button>

      <div className="mt-2 border-t border-border pt-5 text-center">
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
