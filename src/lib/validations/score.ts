import * as z from "zod";

export const ScoreSchema = z.object({
  presentation: z.coerce.number().min(0, { error: "Must be 0 or more." }),
  content: z.coerce.number().min(0, { error: "Must be 0 or more." }),
  overall: z.coerce.number().min(0, { error: "Must be 0 or more." }),
});

export type ScoreFormState =
  | {
      success?: boolean;
      errors?: {
        presentation?: string[];
        content?: string[];
        overall?: string[];
      };
      message?: string;
    }
  | undefined;
