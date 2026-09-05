import { cn } from "@/lib/utils";
import type { Tenant } from "@/lib/types";

export type FestivalBrandProps = {
  name: string;
  logoUrl?: string | null;
  logoUrlDark?: string | null;
  className?: string;
  logoClassName?: string;
  nameClassName?: string;
  /** Print surfaces (certificates, reports) always want the light artwork. */
  forceLight?: boolean;
};

/**
 * The *festival's* brand — distinct from the Fiestify platform mark in the
 * sidebar and on the login page. This is what belongs on anything the
 * festival hands to a participant or shows an audience.
 *
 * Takes plain props rather than a Tenant so it works unchanged in client
 * components, which cannot receive a server-fetched object implicitly.
 *
 * Falls back to the festival's name set as a wordmark when no logo has been
 * uploaded, so every surface reads correctly from day one.
 */
export function FestivalBrand({
  name,
  logoUrl,
  logoUrlDark,
  className,
  logoClassName,
  nameClassName,
  forceLight = false,
}: FestivalBrandProps) {
  if (!logoUrl) {
    return (
      <span
        className={cn(
          "font-heading text-xl font-bold tracking-tight",
          nameClassName,
          className,
        )}
      >
        {name}
      </span>
    );
  }

  const dark = logoUrlDark ?? logoUrl;
  const base = cn("h-auto w-auto object-contain", logoClassName);

  // Plain <img>: a tenant logo has no known intrinsic aspect ratio, and
  // these render inside print stylesheets where next/image's wrapper and
  // lazy loading get in the way.
  /* eslint-disable @next/next/no-img-element */
  if (forceLight || dark === logoUrl) {
    return <img src={logoUrl} alt={name} className={cn(base, className)} />;
  }

  return (
    <span className={cn("inline-flex", className)}>
      <img src={logoUrl} alt={name} className={cn(base, "dark:hidden")} />
      <img src={dark} alt={name} className={cn(base, "hidden dark:block")} />
    </span>
  );
  /* eslint-enable @next/next/no-img-element */
}

/**
 * The subset of a tenant needed to render its brand. Passed as one prop into
 * client components, which cannot resolve a Tenant server-side themselves.
 */
export type FestivalBrandData = {
  name: string;
  logoUrl: string | null;
  logoUrlDark: string | null;
};

/** Spreads a tenant's branding into <FestivalBrand /> props. */
export function festivalBrand(tenant: Pick<Tenant, "name" | "branding">): FestivalBrandData {
  return {
    name: tenant.name,
    logoUrl: tenant.branding?.logo_url ?? null,
    logoUrlDark: tenant.branding?.logo_url_dark ?? null,
  };
}
