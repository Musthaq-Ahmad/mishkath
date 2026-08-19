"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./i18n";

// Renders a QR code for this page's own URL so attendees can pull up
// results on their own phones. Uses a public QR-image API against
// window.location — avoids adding a QR-generation dependency for one
// small decorative widget.
export function ResultsQrCode({
  size = 40,
  showLabel = true,
}: {
  size?: number;
  showLabel?: boolean;
}) {
  const { t } = useLanguage();
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      const data = encodeURIComponent(window.location.href);
      // Always request a source image at least 4x the display size so it
      // stays crisp when rendered larger than the original 40px default.
      const sourceSize = Math.max(160, size * 4);
      setSrc(
        `https://api.qrserver.com/v1/create-qr-code/?size=${sourceSize}x${sourceSize}&margin=0&color=f7bd48&bgcolor=131313&data=${data}`,
      );
    }, 0);
    return () => clearTimeout(id);
  }, [size]);

  if (!src) return null;

  return (
    <div className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- external, non-optimizable QR image */}
      <img
        src={src}
        alt="Scan to view results on your phone"
        width={size}
        height={size}
        className="rounded-sm border border-border"
      />
      {showLabel && (
        <span className="max-w-[90px] text-xs font-medium text-muted-foreground">
          {t("scanForResults")}
        </span>
      )}
    </div>
  );
}
