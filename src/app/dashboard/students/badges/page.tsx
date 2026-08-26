import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { groupTextColor } from "@/lib/group-color";
import { cn } from "@/lib/utils";
import type { Division, Group, Student } from "@/lib/types";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}): Promise<Metadata> {
  const { group: groupId } = await searchParams;
  if (!groupId) return { title: "Chest Number Badges — All Groups" };

  const supabase = await createClient();
  const { data } = await supabase
    .from("groups")
    .select("name")
    .eq("id", groupId)
    .maybeSingle<Pick<Group, "name">>();

  return { title: `Chest Number Badges — ${data?.name ?? "Group"}` };
}

export default async function StudentBadgesPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  await requireRole("admin");

  const { group: groupId } = await searchParams;
  const supabase = await createClient();

  const [{ data: groups }, { data: students }, { data: divisions }] = await Promise.all([
    supabase.from("groups").select("*").order("name").returns<Group[]>(),
    supabase
      .from("students")
      .select("*")
      .not("chest_number", "is", null)
      .order("chest_number")
      .returns<Student[]>(),
    supabase.from("divisions").select("*").returns<Division[]>(),
  ]);

  const groupsList = groups ?? [];
  const groupNameById = new Map(groupsList.map((g) => [g.id, g.name]));
  const divisionNameById = new Map((divisions ?? []).map((d) => [d.id, d.name]));
  const visibleStudents = groupId
    ? (students ?? []).filter((s) => s.group_id === groupId)
    : students ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <Link
            href="/dashboard/students"
            className="mb-1 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Students
          </Link>
          <h1 className="font-heading text-2xl font-semibold text-primary">Chest Number Badges</h1>
          <p className="text-sm text-muted-foreground">
            {visibleStudents.length} badge{visibleStudents.length === 1 ? "" : "s"} ready to print.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/students/badges"
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              !groupId
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            All Groups
          </Link>
          {groupsList.map((group) => (
            <Link
              key={group.id}
              href={`/dashboard/students/badges?group=${group.id}`}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                groupId === group.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {group.name}
            </Link>
          ))}
          <PrintButton label="Print Badges" />
        </div>
      </div>

      {visibleStudents.length ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 print:flex print:flex-wrap print:gap-4">
          {visibleStudents.map((student) => (
            <div
              key={student.id}
              className="relative flex flex-col overflow-hidden rounded-2xl shadow-lg break-inside-avoid [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:w-[calc(33.333%-0.667rem)] print:shrink-0 print:grow-0"
              style={{
                background:
                  "radial-gradient(circle at 30% 12%, #8a4fc0 0%, #6b34a0 35%, #4a2280 68%, #341864 100%)",
              }}
            >
              {/* Islamic geometric texture, tiled across the whole card */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.08]"
                style={{
                  backgroundImage: "url(/poster-pattern.png)",
                  backgroundSize: "45px 45px",
                  backgroundRepeat: "repeat",
                }}
              />

              {/* Arch frame around the logo, echoing a mihrab silhouette */}
              <div className="relative z-10 flex justify-center pt-2">
                <div
                  className="flex items-center justify-center px-5 pt-2 pb-1"
                  style={{
                    width: "76%",
                    background: "linear-gradient(180deg, #7d47bd 0%, #613399 100%)",
                    border: "2px solid #d9b872",
                    borderRadius: "50% 50% 8px 8px / 42% 42% 8px 8px",
                  }}
                >
                  <Image
                    src="/mehfile-meem-logo-gold.png"
                    alt="Mehfile Meem — Meelad Fest 2K26"
                    width={180}
                    height={107}
                    className="h-10 w-auto"
                    priority
                  />
                </div>
              </div>

              {/* Flourish divider */}
              <div className="relative z-10 flex items-center justify-center gap-2 py-1">
                <span
                  className="h-px w-9"
                  style={{ background: "linear-gradient(to left, #d9b872, transparent)" }}
                />
                <span style={{ color: "#d9b872", fontSize: 12 }}>✦</span>
                <span
                  className="h-px w-9"
                  style={{ background: "linear-gradient(to right, #d9b872, transparent)" }}
                />
              </div>

              {/* Chest number panel */}
              <div className="relative z-10 flex flex-col items-center gap-1 px-5">
                <div
                  className="flex w-full flex-col items-center gap-0.5 rounded-xl px-4 py-2 shadow-md"
                  style={{
                    background: "linear-gradient(180deg, #fdfbf6 0%, #f1e9d2 100%)",
                    border: "2px solid #c9a24c",
                  }}
                >
                  <span
                    className="font-heading text-5xl font-black tabular-nums"
                    style={{
                      backgroundImage:
                        "linear-gradient(180deg, #f8e3a8 0%, #caa03e 55%, #8a6a2c 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      color: "transparent",
                      textShadow: "0 1px 0 rgba(255,255,255,0.5)",
                    }}
                  >
                    {student.chest_number}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="h-px w-6" style={{ background: "rgba(201,162,76,0.5)" }} />
                    <span className="size-2 rotate-45" style={{ background: "#c9a24c" }} />
                    <span className="h-px w-6" style={{ background: "rgba(201,162,76,0.5)" }} />
                  </div>
                  <span
                    className="text-[9px] font-bold tracking-widest uppercase"
                    style={{ color: "#3d2260" }}
                  >
                    Chest No.
                  </span>
                </div>
              </div>

              {/* Secondary event caption */}
              <p
                className="relative z-10 mt-1 text-center text-sm font-bold"
                style={{ color: "#e7c25a" }}
              >
                മിലാദ് ഫെസ്റ്റ് 2K26
              </p>

              {/* Name panel */}
              <div
                className="relative z-10 mx-4 mt-3 mb-1.5 overflow-hidden rounded-lg px-3 py-1.5 shadow-sm"
                style={{
                  background: "linear-gradient(180deg, #fdfbf6 0%, #f1e9d2 100%)",
                  border: "2px solid #c9a24c",
                }}
              >
                <p
                  className="text-center text-sm font-bold break-words"
                  style={{ color: "#2c1657" }}
                >
                  {student.name}
                </p>
              </div>

              <div className="relative z-10 flex items-center justify-center gap-2 px-3 pb-2">
                <span
                  className="text-[11px] font-bold tracking-wide uppercase"
                  style={{ color: "#e7c25a", textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}
                >
                  {divisionNameById.get(student.division) ?? "—"}
                </span>
                <span style={{ color: "rgba(231,194,90,0.5)", textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}>
                  ·
                </span>
                <span
                  className={cn(
                    "text-[11px] font-bold tracking-wide uppercase",
                    groupTextColor(student.group_id),
                  )}
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}
                >
                  {groupNameById.get(student.group_id) ?? "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-elevated rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
          No chest numbers assigned yet.
        </div>
      )}
    </div>
  );
}
