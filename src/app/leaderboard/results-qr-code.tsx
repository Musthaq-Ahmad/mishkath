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
    <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/8 p-3 ring-1 ring-gold/25 backdrop-blur-md">
      {/* eslint-disable-next-line @next/next/no-img-element -- external, non-optimizable QR image */}
      <img src={src} alt="Scan to view results on your phone" width={104} height={104} className="rounded-md" />
      <span className="text-xs font-semibold tracking-wide text-primary-foreground/70 uppercase">
        Scan for results
      </span>
    </div>
  );
}
