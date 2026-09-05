"use client";

import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function PublishToggle({
  published,
  onPublish,
  onUnpublish,
}: {
  published: boolean;
  onPublish: () => Promise<{ message?: string } | undefined>;
  onUnpublish: () => Promise<{ message?: string } | undefined>;
}) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await (published ? onUnpublish() : onPublish());
      if (result?.message) {
        toast.error(result.message);
      } else {
        toast.success(published ? "Results unpublished" : "Results published");
      }
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={published}
      disabled={pending}
      onClick={toggle}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        published ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-block size-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform",
          published && "translate-x-[22px]",
        )}
      />
    </button>
  );
}
