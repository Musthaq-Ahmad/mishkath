"use client";

import { useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toastResult } from "@/lib/toast";

export function DeleteButton({
  action,
  className,
  size = "sm",
  children,
  label = "item",
}: {
  action: () => Promise<{ error?: string } | void>;
  className?: string;
  size?: "sm" | "icon-sm";
  children?: ReactNode;
  /** Noun used in the success toast, e.g. "student", "group", "program". */
  label?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={cn("text-destructive hover:text-destructive", className)}
      disabled={pending}
      onClick={() => {
        if (confirm("Are you sure? This cannot be undone.")) {
          startTransition(async () => {
            const result = await action();
            toastResult(result ?? undefined, `${label} deleted`);
          });
        }
      }}
    >
      {pending ? (size === "icon-sm" ? "…" : "Deleting...") : (children ?? "Delete")}
    </Button>
  );
}
