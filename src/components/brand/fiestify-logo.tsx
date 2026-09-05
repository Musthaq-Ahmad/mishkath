import { cn } from "@/lib/utils";

export const APP_NAME = "Fiestify";
export const APP_TAGLINE = "Festival management";
export const APP_DESCRIPTION =
  "Run a festival end to end — groups, students, programs, judging and live results.";

const LOCKUP_DARK_TEXT = "/fiestify-logo.png";
const LOCKUP_LIGHT_TEXT = "/fiestify-logo-light.png";
const MARK = "/fiestify-mark.png";

/**
 * Which ground the logo sits on — not which theme is active.
 *
 * These are different things here: the dashboard sidebar is dark in *both*
 * light and dark mode (see DESIGN.md), so a theme-driven swap would put the
 * near-black wordmark on a near-black rail. Callers state the surface they
 * are painting on; only "auto" defers to the theme.
 */
export type BrandSurface = "auto" | "light" | "dark";

/* eslint-disable @next/next/no-img-element -- static brand art; next/image's
   wrapper and lazy loading get in the way inside print stylesheets. */

/** The gold F alone, for tight spaces. */
export function FiestifyMark({ className }: { className?: string }) {
  return <img src={MARK} alt={APP_NAME} className={cn("h-8 w-auto", className)} />;
}

/** The full Fiestify lockup: gold F plus wordmark. */
export function FiestifyLogo({
  className,
  surface = "auto",
}: {
  className?: string;
  surface?: BrandSurface;
}) {
  const base = cn("h-8 w-auto object-contain", className);

  if (surface === "dark") {
    return <img src={LOCKUP_LIGHT_TEXT} alt={APP_NAME} className={base} />;
  }
  if (surface === "light") {
    return <img src={LOCKUP_DARK_TEXT} alt={APP_NAME} className={base} />;
  }

  return (
    <>
      <img src={LOCKUP_DARK_TEXT} alt={APP_NAME} className={cn(base, "dark:hidden")} />
      <img src={LOCKUP_LIGHT_TEXT} alt={APP_NAME} className={cn(base, "hidden dark:block")} />
    </>
  );
}

/* eslint-enable @next/next/no-img-element */
