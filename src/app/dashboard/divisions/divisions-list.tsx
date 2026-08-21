"use client";

import { useTransition } from "react";
import { DeleteButton } from "@/components/delete-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toastResult } from "@/lib/toast";
import type { Division } from "@/lib/types";
import { DivisionForm } from "./division-form";
import { deleteDivision, moveDivision } from "./actions";

type DivisionWithStats = Division & { studentCount: number; programCount: number };

export function DivisionsList({ divisions }: { divisions: DivisionWithStats[] }) {
  const [pending, startTransition] = useTransition();

  if (!divisions.length) {
    return (
      <div className="card-elevated rounded-xl bg-card p-10 text-center text-muted-foreground ring-1 ring-border">
        No divisions yet.
      </div>
    );
  }

  return (
    <div className="card-elevated flex flex-col divide-y divide-border rounded-xl bg-card ring-1 ring-border">
      {divisions.map((division, index) => (
        <div key={division.id} className="flex items-center gap-4 p-4">
          <div className="flex flex-col">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={pending || index === 0}
              onClick={() =>
                startTransition(async () => {
                  const result = await moveDivision(division.id, "up");
                  toastResult(result, "Moved up");
                })
              }
              className="rounded-lg text-outline"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
              <span className="sr-only">Move up</span>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={pending || index === divisions.length - 1}
              onClick={() =>
                startTransition(async () => {
                  const result = await moveDivision(division.id, "down");
                  toastResult(result, "Moved down");
                })
              }
              className="rounded-lg text-outline"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
              <span className="sr-only">Move down</span>
            </Button>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-heading text-lg font-semibold text-primary">{division.name}</p>
              {!division.is_active && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  Inactive
                </span>
              )}
            </div>
            {division.name_ml && (
              <p className="text-sm text-muted-foreground">{division.name_ml}</p>
            )}
          </div>

          <div className="hidden text-center sm:block">
            <p className="text-[10px] font-bold tracking-wide text-outline uppercase">
              Base chest #
            </p>
            <p className="font-heading text-lg font-semibold text-primary">
              {division.base_chest_number}
            </p>
          </div>

          <div className={cn("hidden text-center sm:block")}>
            <p className="text-[10px] font-bold tracking-wide text-outline uppercase">In use</p>
            <p className="font-heading text-lg font-semibold text-primary">
              {division.studentCount + division.programCount}
            </p>
          </div>

          <div className="flex gap-1">
            <DivisionForm division={division} />
            <DeleteButton
              action={deleteDivision.bind(null, division.id)}
              size="icon-sm"
              className="rounded-lg"
              label="Division"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
              <span className="sr-only">Delete division</span>
            </DeleteButton>
          </div>
        </div>
      ))}
    </div>
  );
}
