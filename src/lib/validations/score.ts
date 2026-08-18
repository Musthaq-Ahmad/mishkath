import * as z from "zod";

export const ScoreSchema = z.object({
  total: z.coerce.number().min(0, { error: "Must be 0 or more." }),
});

export type ScoreFormState =
  | {
      success?: boolean;
      errors?: {
        total?: string[];
      };
      message?: string;
    }
  | undefined;
