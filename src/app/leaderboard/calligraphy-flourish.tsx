// Abstract arabesque/calligraphic flourish — flowing tendril line-art in the
// spirit of Islamic manuscript ornamentation, used as a slow-moving
// background accent (not literal script, so there's no risk of misrendering
// or misrepresenting an actual phrase).
export function CalligraphyFlourish({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden>
      <g fill="none" stroke="var(--gold)" strokeLinecap="round">
        <path
          d="M80,360 C40,300 35,230 85,185 C135,140 210,150 215,205 C219,250 175,275 145,250
             C120,229 130,195 165,190 C195,186 212,208 200,232 C191,250 165,252 158,232"
          strokeWidth="2.5"
          opacity="0.9"
        />
        <path
          d="M320,40 C360,100 365,170 315,215 C265,260 190,250 185,195
             C181,150 225,125 255,150 C280,171 270,205 235,210"
          strokeWidth="2.5"
          opacity="0.6"
        />
        <path d="M85,185 C60,170 45,150 55,125" strokeWidth="2" opacity="0.7" />
        <path d="M215,205 C245,215 265,205 270,180" strokeWidth="2" opacity="0.5" />
        <path d="M315,215 C335,235 340,260 322,280" strokeWidth="2" opacity="0.5" />
        <circle cx="55" cy="125" r="4" fill="var(--gold)" stroke="none" opacity="0.7" />
        <circle cx="270" cy="180" r="3" fill="var(--gold)" stroke="none" opacity="0.5" />
        <circle cx="322" cy="280" r="3" fill="var(--gold)" stroke="none" opacity="0.5" />
      </g>
    </svg>
  );
}
