"use client";

import { useActionState } from "react";
import { adminSubmitScore, adminSubmitGroupScore } from "./score-entry-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GroupScoreRow, ScoreRow } from "@/lib/types";

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

  return (
    <form
      action={formAction}
      className="card-elevated flex flex-col gap-4 rounded-xl bg-card p-5 ring-1 ring-border"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-sm font-semibold text-primary">
          <span className="material-symbols-outlined text-[20px]">badge</span>
        </div>
        <div className="flex flex-1 items-baseline justify-between gap-2 min-w-0">
          <span className="truncate font-heading font-semibold">{name}</span>
          {code && (
            <span className="shrink-0 text-xs text-muted-foreground">Code {code}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label
            htmlFor={`presentation-${rowId}`}
            className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
          >
            Presentation
          </Label>
          <Input
            id={`presentation-${rowId}`}
            name="presentation"
            type="number"
            min={0}
            max={maxScore}
            step="0.5"
            defaultValue={existingScore?.presentation}
            required
          />
          {state?.errors?.presentation && (
            <p className="text-sm text-destructive">{state.errors.presentation[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label
            htmlFor={`content-${rowId}`}
            className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
          >
            Content
          </Label>
          <Input
            id={`content-${rowId}`}
            name="content"
            type="number"
            min={0}
            max={maxScore}
            step="0.5"
            defaultValue={existingScore?.content}
            required
          />
          {state?.errors?.content && (
            <p className="text-sm text-destructive">{state.errors.content[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label
            htmlFor={`overall-${rowId}`}
            className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
          >
            Overall
          </Label>
          <Input
            id={`overall-${rowId}`}
            name="overall"
            type="number"
            min={0}
            max={maxScore}
            step="0.5"
            defaultValue={existingScore?.overall}
            required
          />
          {state?.errors?.overall && (
            <p className="text-sm text-destructive">{state.errors.overall[0]}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <div>
          {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
          {state?.success && (
            <p className="flex items-center gap-1 text-sm font-medium text-success">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Saved
            </p>
          )}
        </div>
        <Button type="submit" size="sm" disabled={pending} className="gap-1.5">
          {pending ? "Saving..." : existingScore ? "Update score" : "Save score"}
        </Button>
      </div>
    </form>
  );
}
