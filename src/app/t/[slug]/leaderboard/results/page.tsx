import { createClient } from "@/lib/supabase/server";
import { getPublicTenant } from "@/lib/tenant";
import { groupPlacements } from "@/lib/leaderboard";
import type { Division, EventPlacementRow, Group } from "@/lib/types";
import { AllResultsView } from "./all-results-view";

export const dynamic = "force-dynamic";

export default async function AllResultsPage() {
  const { slug } = await getPublicTenant();
  const supabase = await createClient();

  const [{ data: placementRows }, { data: groups }, { data: divisions }] = await Promise.all([
    supabase
      .from("public_event_top3")
      .select("*")
      .order("published_at", { ascending: false })
      .order("rank", { ascending: true })
      .returns<EventPlacementRow[]>(),
    supabase.from("groups").select("id, name").returns<Pick<Group, "id" | "name">[]>(),
    supabase.from("divisions").select("*").order("sort_order").returns<Division[]>(),
  ]);

  const placements = groupPlacements(placementRows ?? []);
  const groupNames: Record<string, string> = Object.fromEntries(
    (groups ?? []).map((g) => [g.id, g.name]),
  );

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-8">
      <AllResultsView
        placements={placements}
        groupNames={groupNames}
        divisions={divisions ?? []}
        tenantSlug={slug}
      />
    </div>
  );
}
