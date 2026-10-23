import { toast } from 'sonner';

/** Runs a save and confirms it with a toast; a failure stays on the mutation, which the form shows in an alert. */
export function saveWithToast<I>(save: (input: I) => Promise<unknown>, message: string): (input: I) => Promise<void> {
  return async (input) => {
    try {
      await save(input);
      toast.success(message);
    } catch {
      /* the form shows the mutation's error */
    }
  };
}
