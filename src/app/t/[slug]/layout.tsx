import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTenantContext } from "@/lib/tenant";

type TenantLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const context = await getTenantContext(slug);
  if (!context) return {};

  return {
    title: {
      default: context.tenant.name,
      template: `%s — ${context.tenant.name}`,
    },
  };
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { slug } = await params;

  // Resolve once here so an unknown or invisible tenant 404s at the shell
  // rather than on each nested page. cache()d, so the pages below reuse this
  // lookup rather than repeating it.
  const context = await getTenantContext(slug);
  if (!context) notFound();

  const accent = context.tenant.branding?.accent;

  // `display: contents` keeps this wrapper out of the layout entirely — the
  // leaderboard's full-height flex/grid chain is sensitive to an extra box —
  // while custom properties still inherit through it to every descendant.
  return (
    <div
      className="contents"
      style={accent ? ({ "--primary": accent } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
