import type { OwnProfileInput } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useSavePreferences } from '@/core/theme/use-save-preferences';
import { errorMessage } from '@/shared/lib/error-message';

/** Saves the details a person changes in their own record and says so (or why not) with a toast: the one save of the profile's forms. */
export function useSaveProfile() {
  const { t } = useTranslation('profile');
  const { t: tc } = useTranslation();
  const mutation = useSavePreferences();
  const save = async (input: OwnProfileInput): Promise<void> => {
    try {
      await mutation.mutateAsync(input);
      toast.success(t('saved'));
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
  };
  return { save, pending: mutation.isPending, isError: mutation.isError, error: mutation.error };
}
