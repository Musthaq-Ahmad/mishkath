"use client";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
    >
      <span className="material-symbols-outlined text-[18px]">print</span>
      {label}
    </button>
  );
}
