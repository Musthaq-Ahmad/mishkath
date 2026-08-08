"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const FILTERS = ["By Points", "By Rank", "Captains"] as const;

export function GroupFilterPills({ groupCount }: { groupCount: number }) {
  const [active, setActive] = useState<string>(`All Groups (${groupCount})`);
  const allLabel = `All Groups (${groupCount})`;
  const labels = [allLabel, ...FILTERS];

  return (
    <div className="mb-8 flex flex-wrap gap-3">
      {labels.map((label) => (
        <button
          key={label}
          type="button"
          onClick={() => setActive(label)}
          className={cn(
            "rounded-full px-6 py-2 text-sm font-semibold transition-all active:scale-95",
            active === label
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-card text-muted-foreground hover:border-primary hover:bg-primary/5 hover:text-primary",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
