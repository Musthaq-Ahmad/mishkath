"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { adminSubmitScore, adminSubmitGroupScore } from "./score-entry-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GroupScoreRow, ScoreRow } from "@/lib/types";

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type Common = {
  programId: string;
  code: string | null;
  name: string;
  maxScore: number;
};

export function ScoreEntryRow(
  props:
    | (Common & { kind: "student"; studentId: string; existingScore?: ScoreRow })
    | (Common & { kind: "group"; groupId: string; existingScore?: GroupScoreRow }),
) {
  const { programId, code, name, maxScore, existingScore } = props;
  const boundAction =
    props.kind === "student"
      ? adminSubmitScore.bind(null, programId, props.studentId)
      : adminSubmitGroupScore.bind(null, programId, props.groupId);

  const [state, formAction, pending] = useActionState(boundAction, undefined);
  const rowId = props.kind === "student" ? props.studentId : props.groupId;

  useEffect(() => {
    if (state?.success) {
      toast.success(`Score saved for ${name}`);
    } else if (state?.message) {
      toast.error(state.message);
    }
  }, [state, name]);

  const [total, setTotal] = useState(existingScore?.total ?? "");

  return (
    <form
      action={formAction}
      className="card-elevated flex flex-col gap-4 rounded-xl bg-card p-5 ring-1 ring-border sm:flex-row sm:items-center sm:gap-6"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {code && (
          <span className="shrink-0 font-heading text-sm font-bold text-muted-foreground tabular-nums">
            #{code}
          </span>
        )}
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-xs font-semibold text-primary">
          {initialsOf(name)}
        </div>
        <span className="truncate font-heading font-semibold">{name}</span>
      </div>

      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label
            htmlFor={`total-${rowId}`}
            className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
          >
            Score (out of {maxScore})
          </Label>
          <Input
            id={`total-${rowId}`}
            name="total"
            type="number"
            min={0}
            max={maxScore}
            step="0.5"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            className="h-14 w-28 text-center font-heading text-2xl font-bold tabular-nums sm:w-36"
            required
          />
          {state?.errors?.total && (
            <p className="text-sm text-destructive">{state.errors.total[0]}</p>
          )}
        </div>
        <Button type="submit" size="lg" disabled={pending} className="h-14 gap-1.5">
          {pending ? "Saving..." : existingScore ? "Update" : "Save"}
        </Button>
      </div>
    </form>
  );
}
