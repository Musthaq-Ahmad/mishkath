import Image from "next/image";

export default function Loading() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100%",
        flex: 1,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        background: "var(--background)",
        padding: "64px 24px",
      }}
    >
      {/* Explicit pixel width/height (not `fill` + Tailwind-sized parent) so
          the logo has real dimensions from its own HTML attributes and
          shows up even before any external stylesheet has loaded — the
          scenario this screen exists for. */}
      <div style={{ position: "relative", width: 224, height: 64 }}>
        <Image
          src="/mehfile-meem-logo-gold.png"
          alt="Mehfile Meem"
          width={224}
          height={64}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
          priority
        />
        {/* Shine sweep — a moving highlight masked to the logo's own shape,
            so it only glints across the lettering, not a plain rectangle. */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage:
              "linear-gradient(100deg, transparent 35%, rgba(255,255,255,0.9) 50%, transparent 65%)",
            backgroundSize: "250% 100%",
            WebkitMaskImage: "url(/mehfile-meem-logo-gold.png)",
            maskImage: "url(/mehfile-meem-logo-gold.png)",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskPosition: "center",
            maskPosition: "center",
            animation: "mm-shine-sweep 2.2s ease-in-out infinite",
          }}
        />
      </div>
      <p
        style={{
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--muted-foreground)",
        }}
      >
        Loading
      </p>
      <style>{`
        @keyframes mm-shine-sweep {
          0% { background-position: -120% 0; }
          55% { background-position: 220% 0; }
          100% { background-position: 220% 0; }
        }
      `}</style>
    </div>
  );
}
