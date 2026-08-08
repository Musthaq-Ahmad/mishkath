export function CornerOrnament({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <g fill="none" stroke="var(--gold)" strokeWidth="1.5">
        <path d="M6 60 Q6 6 60 6" opacity="0.5" />
        <path d="M6 40 Q6 22 22 6" opacity="0.4" />
        <path d="M6 80 Q6 92 18 104" opacity="0.25" />
        <path d="M40 6 Q22 6 6 22" opacity="0.4" />
      </g>
      <circle cx="6" cy="6" r="4" fill="var(--gold)" opacity="0.7" />
      <circle cx="34" cy="6" r="2.5" fill="var(--gold)" opacity="0.5" />
      <circle cx="6" cy="34" r="2.5" fill="var(--gold)" opacity="0.5" />
      <circle cx="6" cy="62" r="2" fill="var(--gold)" opacity="0.35" />
    </svg>
  );
}
