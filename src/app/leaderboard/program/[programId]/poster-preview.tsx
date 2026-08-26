"use client";

import { useMemo, useState } from "react";
import { POSTER_VARIANTS, defaultVariantIndex } from "@/lib/poster-variants";

export function PosterPreview({
  programId,
  programName,
}: {
  programId: string;
  programName: string;
}) {
  const [variant, setVariant] = useState(() => defaultVariantIndex(programId));
  const [sharing, setSharing] = useState(false);

  const posterUrl = useMemo(
    () => `/leaderboard/program/${programId}/poster?variant=${variant}`,
    [programId, variant],
  );
  const fileName = `${programName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-results-poster.png`;

  function shuffle() {
    setVariant((current) => {
      let next = Math.floor(Math.random() * POSTER_VARIANTS.length);
      if (POSTER_VARIANTS.length > 1 && next === current) {
        next = (next + 1) % POSTER_VARIANTS.length;
      }
      return next;
    });
  }

  async function share() {
    setSharing(true);
    try {
      const response = await fetch(posterUrl);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${programName} — Results`,
        });
      } else {
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(objectUrl);
      }
    } catch {
      // User cancelled the share sheet, or the browser blocked it — no-op.
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="card-elevated flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-4 sm:p-6 print:hidden">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold text-primary">Results Poster</h2>
          <p className="text-sm text-muted-foreground">
            {POSTER_VARIANTS[variant].name} design — shareable on WhatsApp &amp; Instagram
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={shuffle}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">shuffle</span>
            Shuffle Design
          </button>
          <button
            type="button"
            onClick={share}
            disabled={sharing}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">
              {sharing ? "hourglass_empty" : "share"}
            </span>
            {sharing ? "Preparing…" : "Share / Download"}
          </button>
        </div>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- dynamically generated PNG, not a next/image-optimizable static asset */}
      <img
        key={posterUrl}
        src={posterUrl}
        alt={`${programName} results poster`}
        className="aspect-square w-full max-w-sm rounded-lg border border-border shadow-sm"
      />
    </div>
  );
}
