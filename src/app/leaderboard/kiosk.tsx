"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { CelebrationLayout } from "./celebration-layout";

const ROTATE_MS = 15_000;

function useKioskParam() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const kiosk = searchParams.get("kiosk") === "1";

  function setKiosk(next: boolean) {
    const params = new URLSearchParams(searchParams);
    if (next) params.set("kiosk", "1");
    else params.delete("kiosk");
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return { kiosk, setKiosk };
}

/** Toggle button for the leaderboard header — flips the `?kiosk=1` query
 * param so an unattended TV/projector URL can also be bookmarked directly
 * with kiosk mode already on. */
export function KioskToggleButton() {
  const { kiosk, setKiosk } = useKioskParam();

  return (
    <button
      type="button"
      onClick={() => setKiosk(!kiosk)}
      title="Auto-rotate between the podium and full group standings — for an unattended display"
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        kiosk
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-muted",
      )}
    >
      <span className="material-symbols-outlined text-[18px]">cast</span>
      {kiosk ? "Kiosk: On" : "Kiosk Mode"}
    </button>
  );
}

/** When kiosk mode is off, renders the normal side-by-side celebration
 * layout unchanged. When on, alternates every 15s between that layout and
 * a fullscreen Group Standings view — useful for a single unattended
 * screen that should show both the latest result and overall standings. */
export function KioskStage({
  initialHeroId,
  podium,
  sidebar,
  infoCards,
  footer,
}: {
  initialHeroId: string | null;
  podium: ReactNode;
  sidebar: ReactNode;
  infoCards: ReactNode;
  footer: ReactNode;
}) {
  const { kiosk } = useKioskParam();
  const [focus, setFocus] = useState<"podium" | "standings">("podium");

  useEffect(() => {
    if (!kiosk) return;
    const id = setInterval(() => {
      setFocus((f) => (f === "podium" ? "standings" : "podium"));
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [kiosk]);

  if (kiosk && focus === "standings") {
    return <div className="flex flex-1 flex-col md:min-h-0">{sidebar}</div>;
  }

  return (
    <CelebrationLayout
      initialHeroId={initialHeroId}
      podium={podium}
      sidebar={sidebar}
      infoCards={infoCards}
      footer={footer}
    />
  );
}
