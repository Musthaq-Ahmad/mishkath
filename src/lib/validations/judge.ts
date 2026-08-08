import * as z from "zod";

export const JudgeInviteSchema = z.object({
  fullName: z.string().min(2, { error: "Name must be at least 2 characters." }),
  email: z.email({ error: "Please enter a valid email." }),
});

export type JudgeInviteFormState =
  | {
      errors?: {
        fullName?: string[];
        email?: string[];
      };
      message?: string;
    }
  | undefined;
