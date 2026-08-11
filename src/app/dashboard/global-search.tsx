"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type SearchResult = {
  id: string;
  label: string;
  sublabel: string;
  href: string;
  icon: string;
};

async function runSearch(query: string): Promise<SearchResult[]> {
  const supabase = createClient();
  const [{ data: students }, { data: programs }, { data: groups }] = await Promise.all([
    supabase.from("students").select("id, name").ilike("name", `%${query}%`).limit(5),
    supabase.from("programs").select("id, name").ilike("name", `%${query}%`).limit(5),
    supabase.from("groups").select("id, name").ilike("name", `%${query}%`).limit(5),
  ]);

  return [
    ...(students ?? []).map((s) => ({
      id: `student-${s.id}`,
      label: s.name,
      sublabel: "Student",
      href: `/dashboard/students?q=${encodeURIComponent(s.name)}`,
      icon: "school",
    })),
    ...(programs ?? []).map((p) => ({
      id: `program-${p.id}`,
      label: p.name,
      sublabel: "Program",
      href: `/dashboard/programs/${p.id}`,
      icon: "calendar_month",
    })),
    ...(groups ?? []).map((g) => ({
      id: `group-${g.id}`,
      label: g.name,
      sublabel: "Group",
      href: `/dashboard/groups?q=${encodeURIComponent(g.name)}`,
      icon: "groups",
    })),
  ];
}

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      const found = await runSearch(trimmed);
      setResults(found);
      setLoading(false);
    }, 250);
    return () => clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function goTo(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <div ref={containerRef} className="relative hidden max-w-md flex-1 md:block">
      <span className="material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[18px] text-muted-foreground">
        search
      </span>
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search programs, students or groups..."
        className="w-full rounded-full border-none bg-muted py-2 pr-4 pl-10 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/50"
      />
      {open && query.trim().length >= 2 && (
        <div className="card-elevated absolute top-full left-0 z-20 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card">
          {loading ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Searching…</p>
          ) : results.length ? (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((result) => (
                <li key={result.id}>
                  <Link
                    href={result.href}
                    onClick={() => goTo(result.href)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted"
                  >
                    <span className="material-symbols-outlined text-[18px] text-muted-foreground">
                      {result.icon}
                    </span>
                    <span className="flex-1 truncate">{result.label}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{result.sublabel}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm text-muted-foreground">No matches for &quot;{query}&quot;.</p>
          )}
        </div>
      )}
    </div>
  );
}
