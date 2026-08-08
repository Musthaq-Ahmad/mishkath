"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { generateParticipantCodes } from "../actions";

export function CodesPanel({
  programId,
  hasCodes,
  locked,
}: {
  programId: string;
  hasCodes: boolean;
  locked: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | undefined>(undefined);

  function handleClick() {
    setMessage(undefined);
    startTransition(async () => {
      const result = await generateParticipantCodes(programId);
      if (result?.message) {
        setMessage(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Button onClick={handleClick} disabled={pending || locked}>
          {pending ? "Generating..." : hasCodes ? "Regenerate Codes" : "Generate Codes"}
        </Button>
        {locked && (
          <p className="text-xs text-muted-foreground">
            Judging has begun — codes are locked and cannot be regenerated.
          </p>
        )}
      </div>
      {message && <p className="text-sm text-destructive">{message}</p>}
    </div>
  );
}
