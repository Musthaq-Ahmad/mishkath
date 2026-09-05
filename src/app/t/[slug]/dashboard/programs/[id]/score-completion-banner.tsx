"use client";

import { useTransition } from "react";
import { setProgramStatus } from "../actions";
import { Button } from "@/components/ui/button";
import { toastResult } from "@/lib/toast";
import type { ProgramStatus } from "@/lib/types";

export function ScoreCompletionBanner({
  programId,
  status,
  scoredCount,
  totalCount,
}: {
  programId: string;
  status: ProgramStatus;
  scoredCount: number;
  totalCount: number;
}) {
  const [pending, startTransition] = useTransition();

  if (totalCount === 0) return null;

  const allScored = scoredCount === totalCount;

  if (status === "completed") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
        <span className="material-symbols-outlined text-[18px]">check_circle</span>
        Marked Completed — ready to publish from the Results page.
      </div>
    );
  }

  if (allScored) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          All {totalCount} participants scored — mark this program Completed to enable
          publishing.
        </span>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await setProgramStatus(programId, "completed" satisfies ProgramStatus);
              toastResult(result, "Program marked Completed");
            })
          }
        >
          {pending ? "Updating..." : "Mark Completed"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface-container-low px-4 py-3 text-sm text-muted-foreground">
      <span className="material-symbols-outlined text-[18px]">pending</span>
      {scoredCount} of {totalCount} participants scored so far.
    </div>
  );
}
