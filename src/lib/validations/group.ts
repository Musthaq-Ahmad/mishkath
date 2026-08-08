import * as z from "zod";

export const GroupSchema = z.object({
  name: z.string().min(1, { error: "Name is required." }).trim(),
});

export type GroupFormState =
  | {
      errors?: { name?: string[] };
      message?: string;
    }
  | undefined;
