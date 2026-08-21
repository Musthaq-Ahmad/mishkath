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
  class: z.string().min(1, { error: "Class is required." }).trim(),
  category: z.enum(STUDENT_CATEGORIES, { error: "Category is required." }),
  guardian_name: z.string().trim().optional(),
  admission_number: z.string().trim().optional(),
  date_of_birth: z.string().trim().optional(),
  phone_number: z.string().trim().optional(),
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
        guardian_name?: string[];
        admission_number?: string[];
        date_of_birth?: string[];
        phone_number?: string[];
        is_active?: string[];
        photo_url?: string[];
      };
      message?: string;
    }
  | undefined;
