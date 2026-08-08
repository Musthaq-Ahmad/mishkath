"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

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
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ message?: string } | undefined>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.message) {
        setError(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {published ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(onUnpublish)}
        >
          {pending ? "Updating..." : "Unpublish"}
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          disabled={pending}
          className="gap-1.5"
          onClick={() => run(onPublish)}
        >
          <span className="material-symbols-outlined text-[16px]">publish</span>
          {pending ? "Publishing..." : "Publish"}
        </Button>
      )}
      {error && <p className="max-w-56 text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}
