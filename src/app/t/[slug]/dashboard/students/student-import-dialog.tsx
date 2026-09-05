"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { parseCsv, toCsv, downloadCsv } from "@/lib/csv";
import { bulkImportStudents, type BulkImportRow, type BulkImportResult } from "./actions";

const COLUMNS = ["name", "division", "category", "class", "group_name"] as const;

const TEMPLATE_SAMPLE_ROW = ["Ahmed Ali", "senior", "boy", "10-A", "Al-Falah Zone"];

function rowsFromCsv(text: string): { rows: BulkImportRow[]; error?: string } {
  const parsed = parseCsv(text);
  if (parsed.length < 2) return { rows: [], error: "The file has no data rows." };

  const header = parsed[0].map((h) => h.trim().toLowerCase());
  const nameIdx = header.indexOf("name");
  const divisionIdx = header.indexOf("division");
  const categoryIdx = header.indexOf("category");
  const classIdx = header.indexOf("class");
  const groupIdx = header.indexOf("group_name");

  if ([nameIdx, divisionIdx, categoryIdx, classIdx, groupIdx].includes(-1)) {
    return {
      rows: [],
      error: `Missing required column(s). Expected headers: ${COLUMNS.join(", ")}.`,
    };
  }

  const rows: BulkImportRow[] = parsed.slice(1).map((cells) => ({
    name: cells[nameIdx]?.trim() ?? "",
    division: cells[divisionIdx]?.trim() ?? "",
    category: cells[categoryIdx]?.trim() ?? "",
    class: cells[classIdx]?.trim() ?? "",
    group_name: cells[groupIdx]?.trim() ?? "",
  }));

  return { rows };
}

export function StudentImportDialog() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<BulkImportRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setRows([]);
    setParseError(null);
    setFileName(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFile(file: File) {
    setResult(null);
    setFileName(file.name);
    const text = await file.text();
    const { rows: parsedRows, error } = rowsFromCsv(text);
    setParseError(error ?? null);
    setRows(error ? [] : parsedRows);
  }

  async function handleImport() {
    setImporting(true);
    const outcome = await bulkImportStudents(rows);
    setResult(outcome);
    setImporting(false);
    setRows([]);

    if (outcome.inserted > 0 && outcome.errors.length === 0) {
      toast.success(`${outcome.inserted} student${outcome.inserted === 1 ? "" : "s"} imported`);
    } else if (outcome.inserted > 0) {
      toast.warning(
        `${outcome.inserted} imported, ${outcome.errors.length} skipped — see details below`,
      );
    } else {
      toast.error("No students imported — see details below");
    }
  }

  function downloadTemplate() {
    downloadCsv("students-template.csv", toCsv([...COLUMNS], [TEMPLATE_SAMPLE_ROW]));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button type="button" variant="outline" className="gap-1.5">
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            Import CSV
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk import students</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={downloadTemplate}
            className="flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Download CSV template
          </button>

          <div className="flex flex-col gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Required columns: name, division, category, class, group_name. Group names must
              match an existing group exactly (case-insensitive).
            </p>
          </div>

          {parseError && <p className="text-sm text-destructive">{parseError}</p>}

          {fileName && !parseError && rows.length > 0 && !result && (
            <p className="text-sm text-muted-foreground">
              Found <span className="font-semibold text-foreground">{rows.length}</span> row
              {rows.length === 1 ? "" : "s"} in {fileName}, ready to import.
            </p>
          )}

          {result && (
            <div className="flex flex-col gap-2 rounded-lg border border-border p-3 text-sm">
              <p className="flex items-center gap-1.5 font-medium text-success">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                {result.inserted} student{result.inserted === 1 ? "" : "s"} imported.
              </p>
              {result.errors.length > 0 && (
                <div className="flex flex-col gap-1">
                  <p className="font-medium text-destructive">
                    {result.errors.length} row{result.errors.length === 1 ? "" : "s"} skipped:
                  </p>
                  <ul className="max-h-40 list-inside list-disc overflow-y-auto text-muted-foreground">
                    {result.errors.map((e) => (
                      <li key={e.row}>
                        Row {e.row}: {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button
              type="button"
              disabled={!rows.length || importing}
              onClick={handleImport}
              className="gap-1.5"
            >
              {importing ? "Importing..." : `Import ${rows.length || ""} student${rows.length === 1 ? "" : "s"}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
