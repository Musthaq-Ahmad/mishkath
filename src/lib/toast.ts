import { toast } from "sonner";

/** Fire-and-forget actions across the app return `{ error?: string } | undefined`
 * — this turns that into the matching toast so every call site stays terse. */
export function toastResult(result: { error?: string } | undefined, successMessage: string) {
  if (result?.error) {
    toast.error(result.error);
  } else {
    toast.success(successMessage);
  }
}
