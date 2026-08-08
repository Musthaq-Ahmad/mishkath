import * as z from "zod";

export const LoginSchema = z.object({
  email: z.email({ error: "Please enter a valid email." }),
  password: z.string().min(6, { error: "Password must be at least 6 characters." }),
});

export const SignupSchema = z.object({
  fullName: z.string().min(2, { error: "Name must be at least 2 characters." }),
  email: z.email({ error: "Please enter a valid email." }),
  password: z.string().min(6, { error: "Password must be at least 6 characters." }),
});

export type LoginFormState =
  | {
      errors?: {
        email?: string[];
        password?: string[];
      };
      message?: string;
    }
  | undefined;

export type SignupFormState =
  | {
      errors?: {
        fullName?: string[];
        email?: string[];
        password?: string[];
      };
      message?: string;
    }
  | undefined;
