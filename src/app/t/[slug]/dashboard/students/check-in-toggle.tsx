"use client";

import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { toastResult } from "@/lib/toast";
import { setStudentCheckedIn } from "./actions";

export function CheckInToggle({ studentId, checkedIn }: { studentId: string; checkedIn: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checkedIn}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await setStudentCheckedIn(studentId, !checkedIn);
          toastResult(result, checkedIn ? "Checked out" : "Checked in");
        })
      }
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        checkedIn ? "bg-success" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-block size-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform",
          checkedIn && "translate-x-[22px]",
        )}
      />
    </button>
  );
}
