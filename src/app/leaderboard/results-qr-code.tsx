"use client";

import { useEffect, useState } from "react";

// Renders a QR code for this page's own URL so attendees can pull up
// results on their own phones. Uses a public QR-image API against
// window.location — avoids adding a QR-generation dependency for one
// small decorative widget.
export function ResultsQrCode() {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      const data = encodeURIComponent(window.location.href);
      setSrc(
        `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=0&color=0b0f19&bgcolor=ffffff&data=${data}`,
      );
    }, 0);
    return () => clearTimeout(id);
  }, []);

  if (!src) return null;

  return (
    <div className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- external, non-optimizable QR image */}
      <img
        src={src}
        alt="Scan to view results on your phone"
        width={40}
        height={40}
        className="rounded-sm border border-border"
      />
      <span className="hidden text-xs font-medium text-muted-foreground lg:block">
        Scan for
        <br />
        results
      </span>
    </div>
  );
}
