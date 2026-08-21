import * as z from "zod";

export const DivisionSchema = z.object({
  name: z.string().min(1, { error: "Name is required." }).trim(),
  name_ml: z.string().trim().optional(),
  base_chest_number: z.coerce
    .number({ error: "Base chest number must be a number." })
    .min(1, { error: "Base chest number must be at least 1." }),
  is_active: z.coerce.boolean().default(true),
});

export type DivisionFormState =
  | {
      errors?: {
        name?: string[];
        name_ml?: string[];
        base_chest_number?: string[];
        is_active?: string[];
      };
      message?: string;
    }
  | undefined;
