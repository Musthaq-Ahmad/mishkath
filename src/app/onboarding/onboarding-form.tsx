"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createTenant } from "./actions";

/** Mirrors the slug rules so the preview never shows an address the server would reject. */
function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function OnboardingForm() {
  const [state, action, pending] = useActionState(createTenant, undefined);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  // Until the address is edited by hand it tracks the name, which is what
  // almost everyone wants and saves a second field's worth of typing.
  const [slugTouched, setSlugTouched] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const effectiveSlug = slugTouched ? slug : toSlug(name);

  useEffect(() => {
    if (state?.message) toast.error(state.message);
  }, [state]);

  // Object URLs are not garbage collected on their own.
  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name" className="ml-0.5 text-xs font-semibold tracking-wide text-muted-foreground">
          Festival Name
        </Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Spring Arts Fest"
          required
          className="h-12"
        />
        {state?.errors?.name && (
          <p className="text-sm text-destructive">{state.errors.name[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="slug" className="ml-0.5 text-xs font-semibold tracking-wide text-muted-foreground">
          Address
        </Label>
        <Input
          id="slug"
          name="slug"
          value={effectiveSlug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(toSlug(event.target.value));
          }}
          placeholder="spring-arts-fest"
          required
          className="h-12"
        />
        <p className="ml-0.5 text-xs text-muted-foreground">
          Your festival will live at{" "}
          <span className="font-medium text-foreground">
            /t/{effectiveSlug || "your-address"}
          </span>
        </p>
        {state?.errors?.slug && (
          <p className="text-sm text-destructive">{state.errors.slug[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="logo" className="ml-0.5 text-xs font-semibold tracking-wide text-muted-foreground">
          Festival Logo <span className="font-normal normal-case">(optional)</span>
        </Label>
        <div className="flex items-center gap-3">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted">
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="" className="size-full object-contain p-1.5" />
            ) : (
              <span className="material-symbols-outlined text-[22px] text-muted-foreground">
                image
              </span>
            )}
          </div>
          <Input
            id="logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="h-12 py-3 file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:font-medium"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setLogoPreview((current) => {
                if (current) URL.revokeObjectURL(current);
                return file ? URL.createObjectURL(file) : null;
              });
            }}
          />
        </div>
        <p className="ml-0.5 text-xs text-muted-foreground">
          Appears on your leaderboard, reports, certificates and posters. PNG,
          JPEG, WebP or SVG, up to 2&nbsp;MB. You can add it later instead.
        </p>
        {state?.errors?.logo && (
          <p className="text-sm text-destructive">{state.errors.logo[0]}</p>
        )}
      </div>

      <Button type="submit" size="lg" disabled={pending} className="h-12 gap-2 rounded-full">
        {pending ? "Creating…" : "Create festival"}
        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
      </Button>
    </form>
  );
}
