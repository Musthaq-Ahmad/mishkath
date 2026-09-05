import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Festival suspended" };

/**
 * Where requireTenant() sends a member of a tenant whose status is
 * 'suspended' — they are a legitimate member, so a 404 would be misleading.
 */
export default function SuspendedPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
      <span className="material-symbols-outlined text-[40px] text-muted-foreground">pause_circle</span>
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">This festival is suspended</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Its dashboard and public leaderboard are temporarily unavailable.
          Contact the platform administrator to restore access.
        </p>
      </div>
      <Button variant="outline" className="rounded-full" render={<Link href="/onboarding" />}>
        Back to your festivals
      </Button>
    </div>
  );
}
