"use client";

import { useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DeleteButton({
  action,
  className,
  size = "sm",
  children,
}: {
  action: () => Promise<void>;
  className?: string;
  size?: "sm" | "icon-sm";
  children?: ReactNode;
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
          startTransition(() => action());
        }
      }}
    >
      {pending ? (size === "icon-sm" ? "…" : "Deleting...") : (children ?? "Delete")}
    </Button>
  );
}
