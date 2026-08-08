"use client";

import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { setProgramStatus } from "../actions";
import { PROGRAM_STATUSES, PROGRAM_STATUS_LABELS } from "@/lib/validations/program";
import type { ProgramStatus } from "@/lib/types";

export function StatusControl({
  programId,
  status,
}: {
  programId: string;
  status: ProgramStatus;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
      {PROGRAM_STATUSES.map((s) => {
        const active = s === status;
        return (
          <button
            key={s}
            type="button"
            disabled={pending}
            onClick={() => {
              if (!active) {
                startTransition(() => setProgramStatus(programId, s));
              }
            }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-background/60",
              pending && "opacity-50",
            )}
          >
            {PROGRAM_STATUS_LABELS[s]}
          </button>
        );
      })}
    </div>
  );
}
