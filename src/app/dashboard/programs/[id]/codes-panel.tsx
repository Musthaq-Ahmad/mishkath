"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateParticipantCodes } from "../actions";

export function CodesPanel({
  programId,
  hasCodes,
  locked,
  hasMissingCodes,
}: {
  programId: string;
  hasCodes: boolean;
  locked: boolean;
  hasMissingCodes: boolean;
}) {
  const [pending, startTransition] = useTransition();

  // Once judging has started, a full reshuffle would invalidate codes
  // already scored against — but a participant added afterwards still has
  // no code at all, so the button stays enabled to assign just theirs.
  const disabled = pending || (locked && !hasMissingCodes);

  function handleClick() {
    startTransition(async () => {
      const result = await generateParticipantCodes(programId);
      if (result?.message) {
        toast.error(result.message);
      } else {
        toast.success(locked ? "Codes assigned" : hasCodes ? "Codes regenerated" : "Codes generated");
      }
    });
  }

  const label = pending
    ? "Generating..."
    : locked
      ? "Assign Codes to New Participants"
      : hasCodes
        ? "Regenerate Codes"
        : "Generate Codes";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Button onClick={handleClick} disabled={disabled}>
          {label}
        </Button>
        {locked && (
          <p className="text-xs text-muted-foreground">
            {hasMissingCodes
              ? "Judging has begun — existing codes are locked, but new participants without a code can still be assigned one."
              : "Judging has begun — codes are locked and cannot be regenerated."}
          </p>
        )}
      </div>
    </div>
  );
}
