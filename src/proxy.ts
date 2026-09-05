import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { TENANT_SLUG_HEADER, parseTenantSlug } from "@/lib/tenant-slug";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const tenantSlug = parseTenantSlug(pathname);

  // Strip any client-supplied value before setting our own — the header is
  // read by the server-side tenant lookup, so it must reflect the URL and
  // nothing else. (Authorization still runs on top of this; see
  // src/lib/tenant.ts.)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(TENANT_SLUG_HEADER);
  if (tenantSlug) {
    requestHeaders.set(TENANT_SLUG_HEADER, tenantSlug);
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request: { headers: requestHeaders } });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Optimistic checks only. Next's own guidance is that Proxy is not a session
  // management or authorization layer — the real gate is requireTenant() in
  // the DAL plus RLS. This just avoids rendering a dashboard shell for someone
  // who is plainly logged out.
  const isDashboard =
    pathname.startsWith("/dashboard") ||
    (tenantSlug !== null && pathname.startsWith(`/t/${tenantSlug}/dashboard`));

  if (!user && isDashboard) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    // /dashboard resolves the user's default tenant and forwards on; the
    // proxy deliberately does no database work of its own.
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
