import * as z from "zod";
import { STUDENT_DIVISIONS } from "./student";

export const PROGRAM_TYPES = ["individual", "group"] as const;

export const PROGRAM_TYPE_LABELS: Record<(typeof PROGRAM_TYPES)[number], string> = {
  individual: "Individual",
  group: "Group",
};

export const GENDER_CATEGORIES = ["boy", "girl", "mixed"] as const;

export const GENDER_CATEGORY_LABELS: Record<(typeof GENDER_CATEGORIES)[number], string> = {
  boy: "Boys",
  girl: "Girls",
  mixed: "Mixed",
};

export const PROGRAM_STATUSES = ["draft", "scheduled", "running", "completed"] as const;

export const PROGRAM_STATUS_LABELS: Record<(typeof PROGRAM_STATUSES)[number], string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  running: "Running",
  completed: "Completed",
};

export const ProgramSchema = z.object({
  name: z.string().min(1, { error: "Name is required." }).trim(),
  category: z.enum(STUDENT_DIVISIONS, { error: "Category is required." }),
  program_type: z.enum(PROGRAM_TYPES, { error: "Program type is required." }),
  gender_category: z.enum(GENDER_CATEGORIES, { error: "Category is required." }),
  max_score: z.coerce
    .number({ error: "Max score must be a number." })
    .min(1, { error: "Max score must be at least 1." }),
  scheduled_start: z.string().trim().optional(),
});

export type ProgramFormState =
  | {
      errors?: {
        name?: string[];
        category?: string[];
        program_type?: string[];
        gender_category?: string[];
        max_score?: string[];
        scheduled_start?: string[];
      };
      message?: string;
    }
  | undefined;
