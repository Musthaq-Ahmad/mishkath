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
    <div className="flex flex-col items-center gap-1 rounded-xl border border-gold/25 bg-white/5 px-5 py-2">
      <span className="text-xs font-bold tracking-widest text-gold uppercase">സമയം</span>
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[22px] text-gold">schedule</span>
        <div className="leading-tight">
          <p className="font-heading text-lg font-black tabular-nums">
            {now
              ? now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
              : "--:--"}
          </p>
          <p className="text-xs text-primary-foreground/60">
            {now
              ? now.toLocaleDateString("en-US", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })
              : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
