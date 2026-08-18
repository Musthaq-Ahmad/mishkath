"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addProgramJudge, removeProgramJudge } from "../actions";
import type { ProgramJudge } from "@/lib/types";

export function JudgesPanel({
  programId,
  judges,
}: {
  programId: string;
  judges: ProgramJudge[];
}) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await addProgramJudge(programId, trimmed);
      if (result?.error) {
        toast.error(result.error);
      } else {
        setName("");
      }
    });
  }

  function handleRemove(judgeId: string) {
    startTransition(async () => {
      const result = await removeProgramJudge(programId, judgeId);
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAdd();
        }}
        className="flex items-center gap-2"
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Judge name"
          disabled={pending}
          className="max-w-sm"
        />
        <Button type="submit" disabled={pending || !name.trim()}>
          Add Judge
        </Button>
      </form>

      {judges.length ? (
        <ul className="flex flex-col gap-2">
          {judges.map((judge) => (
            <li
              key={judge.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-2"
            >
              <span className="font-medium">{judge.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => handleRemove(judge.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No judges added yet — names entered here print on the judge scoresheet.
        </p>
      )}
    </div>
  );
}
