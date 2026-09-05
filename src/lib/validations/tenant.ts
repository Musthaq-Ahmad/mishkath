import * as z from "zod";

// Mirrors the CHECK constraint on tenants.slug in 20260905062620_tenants.sql, and the
// reserved list inside create_tenant(). Validated here as well so a bad slug
// is a field error under the input rather than a raised Postgres exception.
export const TenantSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, { error: "Address must be at least 2 characters." })
  .max(32, { error: "Address must be 32 characters or fewer." })
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, {
    error: "Use lowercase letters, numbers and hyphens, not starting or ending with a hyphen.",
  });

export const CreateTenantSchema = z.object({
  name: z.string().min(1, { error: "Festival name is required." }).trim(),
  slug: TenantSlugSchema,
});

/** Mirrors the bucket's allowed_mime_types and file_size_limit. */
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
] as const;

export function validateLogo(file: File | null): string | null {
  if (!file || file.size === 0) return null;
  if (!LOGO_MIME_TYPES.includes(file.type as (typeof LOGO_MIME_TYPES)[number])) {
    return "Logo must be a PNG, JPEG, WebP or SVG file.";
  }
  if (file.size > LOGO_MAX_BYTES) {
    return "Logo must be 2 MB or smaller.";
  }
  return null;
}

export type CreateTenantFormState =
  | {
      errors?: {
        name?: string[];
        slug?: string[];
        logo?: string[];
      };
      message?: string;
    }
  | undefined;
