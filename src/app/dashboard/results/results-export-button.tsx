"use client";

import { downloadCsv, toCsv } from "@/lib/csv";

export type ResultsExportRow = {
  name: string;
  category: string;
  scored: number;
  total: number;
  evaluationStatus: string;
  publishedStatus: string;
};

export function ResultsExportButton({ rows }: { rows: ResultsExportRow[] }) {
  return (
    <button
      type="button"
      onClick={() =>
        downloadCsv(
          "programs-results.csv",
          toCsv(
            ["Program Name", "Category", "Scored", "Total", "Evaluation Status", "Published Status"],
            rows.map((r) => [r.name, r.category, r.scored, r.total, r.evaluationStatus, r.publishedStatus]),
          ),
        )
      }
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
    >
      <span className="material-symbols-outlined text-[18px]">download</span>
      Export CSV
    </button>
  );
}
