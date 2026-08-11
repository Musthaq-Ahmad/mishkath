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

  const [presentation, setPresentation] = useState(existingScore?.presentation ?? "");
  const [content, setContent] = useState(existingScore?.content ?? "");
  const [overall, setOverall] = useState(existingScore?.overall ?? "");
  const total =
    (Number(presentation) || 0) + (Number(content) || 0) + (Number(overall) || 0);

  return (
    <form
      action={formAction}
      className="card-elevated flex flex-col gap-4 rounded-xl bg-card p-5 ring-1 ring-border"
    >
      <div className="flex items-center gap-3">
        {code && (
          <span className="shrink-0 font-heading text-sm font-bold text-muted-foreground tabular-nums">
            #{code}
          </span>
        )}
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-xs font-semibold text-primary">
          {initialsOf(name)}
        </div>
        <span className="truncate font-heading font-semibold">{name}</span>
        <span className="ml-auto shrink-0 text-right">
          <span className="text-xs text-muted-foreground uppercase">Total</span>{" "}
          <span className="font-heading text-lg font-bold tabular-nums text-primary">
            {total}
          </span>
        </span>
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
            value={presentation}
            onChange={(e) => setPresentation(e.target.value)}
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
            value={content}
            onChange={(e) => setContent(e.target.value)}
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
            value={overall}
            onChange={(e) => setOverall(e.target.value)}
            required
          />
          {state?.errors?.overall && (
            <p className="text-sm text-destructive">{state.errors.overall[0]}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
        <Button type="submit" size="sm" disabled={pending} className="gap-1.5">
          {pending ? "Saving..." : existingScore ? "Update score" : "Save score"}
        </Button>
      </div>
    </form>
  );
}
