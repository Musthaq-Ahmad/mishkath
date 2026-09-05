"use server";

import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { tenantPath } from "@/lib/tenant";
import {
  CreateTenantSchema,
  validateLogo,
  type CreateTenantFormState,
} from "@/lib/validations/tenant";

const LOGO_BUCKET = "tenant-logos";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export async function createTenant(
  _state: CreateTenantFormState,
  formData: FormData,
): Promise<CreateTenantFormState> {
  await verifySession();

  const validatedFields = CreateTenantSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const logoEntry = formData.get("logo");
  const logo = logoEntry instanceof File ? logoEntry : null;
  const logoError = validateLogo(logo);
  if (logoError) {
    return { errors: { logo: [logoError] } };
  }

  const { name, slug } = validatedFields.data;
  const supabase = await createClient();

  // create_tenant() inserts the tenant and its owner membership in one
  // transaction — there is deliberately no INSERT policy on `tenants`, so
  // this RPC is the only way in and a tenant can never end up ownerless.
  const { data: tenantId, error } = await supabase.rpc("create_tenant", {
    p_slug: slug,
    p_name: name,
  });

  if (error) {
    // The function raises with distinguishable SQLSTATEs: 23505 for a taken
    // slug, 23514 for a reserved one. Both are the user's to fix, so they
    // belong on the field rather than in a generic banner.
    if (error.code === "23505" || error.code === "23514") {
      return { errors: { slug: [error.message] } };
    }
    return { message: "Could not create the festival. Please try again." };
  }

  // Upload after creation, not before: the storage path is keyed by tenant
  // id, and the write policy checks membership in that tenant — which only
  // exists once create_tenant() has run.
  if (logo && tenantId) {
    const extension = EXTENSION_BY_MIME[logo.type] ?? "png";
    const path = `${tenantId}/logo.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(path, logo, { contentType: logo.type, upsert: true });

    if (uploadError) {
      // The festival exists and is usable; only its logo is missing. Sending
      // the user back to a form that would now fail on a duplicate slug would
      // be worse than letting them add the logo from settings later.
      console.error("Festival logo upload failed:", uploadError.message);
    } else {
      const {
        data: { publicUrl },
      } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);

      const { error: brandingError } = await supabase
        .from("tenants")
        .update({ branding: { logo_url: publicUrl } })
        .eq("id", tenantId);

      if (brandingError) {
        console.error("Festival branding update failed:", brandingError.message);
      }
    }
  }

  redirect(tenantPath(slug, "/dashboard"));
}
