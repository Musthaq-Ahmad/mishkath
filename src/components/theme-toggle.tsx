"use client";

import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={
        resolvedTheme
          ? isDark
            ? "Switch to light theme"
            : "Switch to dark theme"
          : "Toggle theme"
      }
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-container-low hover:text-primary ${className ?? ""}`}
    >
      <span className="material-symbols-outlined text-[20px]">
        {resolvedTheme ? (isDark ? "light_mode" : "dark_mode") : "brightness_6"}
      </span>
    </button>
  );
}
