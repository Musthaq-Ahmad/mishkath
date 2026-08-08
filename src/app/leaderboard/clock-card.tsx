"use client";

import { useEffect, useState } from "react";

// Starts null so server and first client render agree (no hydration
// mismatch); resolves to the real clock right after mount via a nested
// interval callback.
export function ClockCard() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className="material-symbols-outlined text-[20px]">schedule</span>
      <div className="leading-tight">
        <p className="font-heading text-lg font-semibold tabular-nums text-foreground">
          {now
            ? now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
            : "--:--"}
        </p>
      </div>
    </div>
  );
}
