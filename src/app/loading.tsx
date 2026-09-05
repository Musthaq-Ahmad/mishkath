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
        gap: 14,
        background: "var(--background)",
        padding: "64px 24px",
      }}
    >
      {/* The mark alone, not the full lockup: this screen renders before any
          stylesheet has loaded — which is the whole reason it exists — so a
          theme-driven swap is not available, and the near-black wordmark
          would disappear against the dark background. The gold F reads on
          either ground. Explicit width/height attributes for the same
          reason. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/fiestify-mark.png"
        alt="Fiestify"
        width={72}
        height={71}
        style={{
          width: 72,
          height: "auto",
          animation: "fiestify-pulse 1.6s ease-in-out infinite",
        }}
      />
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
        @keyframes fiestify-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.72; transform: scale(0.94); }
        }
      `}</style>
    </div>
  );
}
