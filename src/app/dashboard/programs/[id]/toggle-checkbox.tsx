"use client";

import { useTransition } from "react";
import { cn } from "@/lib/utils";

export function ToggleCheckbox({
  checked,
  label,
  action,
}: {
  checked: boolean;
  label: string;
  action: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <label
      className={cn(
        "flex items-center gap-2.5 rounded-lg border border-border p-2.5 text-sm transition-colors",
        checked ? "border-primary/20 bg-primary/5" : "hover:bg-muted/60",
        pending && "opacity-50",
      )}
    >
      <input
        type="checkbox"
        className="size-4 rounded border-input text-primary accent-primary"
        checked={checked}
        disabled={pending}
        onChange={() => {
          startTransition(() => action());
        }}
      />
      {label}
    </label>
  );
}
