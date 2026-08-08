"use client";

import { useEffect, useState } from "react";

// Replaces next-themes: its ThemeProvider injects a raw <script> tag for
// flash-prevention that this Next.js build rejects outright ("Encountered a
// script tag while rendering React component"). The actual flash-prevention
// script now lives inline in the root layout's <head> instead; this hook
// only mirrors that already-applied "dark" class into React state.
//
// resolvedTheme starts undefined (matching server output) so hydration
// never mismatches; it resolves to the real value right after mount.
export function useTheme() {
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark" | undefined>(undefined);

  useEffect(() => {
    const id = setTimeout(() => {
      setResolvedTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    }, 0);
    return () => clearTimeout(id);
  }, []);

  function setTheme(next: "light" | "dark") {
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("theme", next);
    } catch {
      // localStorage unavailable (private browsing, etc.) — theme just won't persist.
    }
    setResolvedTheme(next);
  }

  return { resolvedTheme, setTheme };
}
