import { cn } from "@/lib/utils";
import type { StudentCategory } from "@/lib/types";

/** Simple flat silhouette: head + shoulders + a rounded topi (skullcap). */
function BoyAvatar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" aria-hidden className={className}>
      <path d="M50 60c-19 0-34 13-34 32v8h68v-8c0-19-15-32-34-32z" />
      <circle cx="50" cy="42" r="20" />
      <ellipse cx="50" cy="30" rx="15" ry="12" />
    </svg>
  );
}

/** Simple flat silhouette: a single draped shape reading as head + hijab. */
function GirlAvatar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" aria-hidden className={className}>
      <path d="M50 15 Q25 15 22 50 Q20 75 15 100 L85 100 Q80 75 78 50 Q75 15 50 15 Z" />
    </svg>
  );
}

/** Plain head + shoulders, for the rare case a category isn't known. */
function PersonAvatar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" aria-hidden className={className}>
      <path d="M50 60c-19 0-34 13-34 32v8h68v-8c0-19-15-32-34-32z" />
      <circle cx="50" cy="38" r="20" />
    </svg>
  );
}

/** Two overlapping head-and-shoulder shapes, for group-type placements. */
function GroupsAvatar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" aria-hidden className={className}>
      <circle cx="35" cy="35" r="15" />
      <path d="M35 55c-14 0-25 10-25 24v6h35v-6c0-8 2-15 6-20-4-2-10-4-16-4z" />
      <circle cx="68" cy="38" r="13" />
      <path d="M68 55c13 0 23 9 23 22v8H55v-8c0-8-2-16-6-21 5-1 11-1 19-1z" />
    </svg>
  );
}

/**
 * Falls back to a gender-appropriate illustrated avatar when a participant
 * has no uploaded photo. `category` is null for group-type placements
 * (no single student), which falls back to the generic "groups" icon.
 */
export function PlaceholderAvatar({
  category,
  isGroup,
  className,
}: {
  category: StudentCategory | null;
  isGroup: boolean;
  className?: string;
}) {
  const commonClassName = cn("text-muted-foreground", className);

  if (isGroup) {
    return <GroupsAvatar className={commonClassName} />;
  }
  if (category === "boy") {
    return <BoyAvatar className={commonClassName} />;
  }
  if (category === "girl") {
    return <GirlAvatar className={commonClassName} />;
  }
  return <PersonAvatar className={commonClassName} />;
}
