import * as z from "zod";

export const STUDENT_CATEGORIES = ["boy", "girl"] as const;

export const STUDENT_CATEGORY_LABELS: Record<(typeof STUDENT_CATEGORIES)[number], string> = {
  boy: "Boy",
  girl: "Girl",
};

export const StudentSchema = z.object({
  name: z.string().min(1, { error: "Name is required." }).trim(),
  group_id: z.string().min(1, { error: "Group is required." }),
  division: z.string().min(1, { error: "Division is required." }),
  class: z.string().trim().optional(),
  category: z.enum(STUDENT_CATEGORIES, { error: "Category is required." }),
  is_active: z.coerce.boolean().default(true),
  photo_url: z.string().trim().optional(),
});

export type StudentFormState =
  | {
      errors?: {
        name?: string[];
        group_id?: string[];
        division?: string[];
        class?: string[];
        category?: string[];
        is_active?: string[];
        photo_url?: string[];
      };
      message?: string;
    }
  | undefined;
