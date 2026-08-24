"use client";

import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function MementoToggle({
  given,
  onGive,
  onUndo,
}: {
  given: boolean;
  onGive: () => Promise<{ message?: string } | undefined>;
  onUndo: () => Promise<{ message?: string } | undefined>;
}) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await (given ? onUndo() : onGive());
      if (result?.message) {
        toast.error(result.message);
      } else {
        toast.success(given ? "Memento marked as not given" : "Memento marked as given");
      }
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={given}
      disabled={pending}
      onClick={toggle}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        given ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-block size-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform",
          given && "translate-x-[22px]",
        )}
      />
    </button>
  );
}
