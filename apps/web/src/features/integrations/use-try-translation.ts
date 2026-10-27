import type { IntegrationKind, TestResultDto } from '@arweqah-platform/shared';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/core/api/api-client';
import { errorMessage } from '@/shared/lib/error-message';
import { useDebounced } from '@/shared/lib/use-debounced';
import type { SentValues } from './api';

interface Outcome {
  english: string;
  problem: string | null;
}

function outcomeOf(answer: TestResultDto | undefined, error: unknown, t: TFunction, tc: TFunction): Outcome {
  if (error) return { english: '', problem: errorMessage(tc, error) };
  if (!answer) return { english: '', problem: null };
  return answer.ok ? { english: answer.text ?? '', problem: null } : { english: '', problem: answer.message || t('test.failed') };
}

/**
 * The try-out popup of a translation service: the English for the Arabic typed so far, asked again each time the text pauses,
 * with the data in the form. `pending` is true while the person is typing or the answer is on its way.
 */
export function useTryTranslation(kind: IntegrationKind, providerKey: string, values: SentValues | undefined, arabic: string) {
  const { t } = useTranslation('integrations');
  const { t: tc } = useTranslation();
  const client = useQueryClient();
  const text = arabic.trim();
  const source = useDebounced(text, 700);
  const query = useQuery({
    queryKey: ['integrations', 'try', kind, providerKey, source],
    enabled: source !== '',
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const result = await apiClient.post<TestResultDto>(`/integrations/${kind}/${providerKey}/test`, { values, text: source });
      // A passed test is remembered against the saved data, so the list must show it.
      await client.invalidateQueries({ queryKey: ['integrations', kind], exact: true });
      return result;
    },
  });
  const pending = text !== '' && (text !== source || query.isFetching);
  const outcome = text === '' || pending ? { english: '', problem: null } : outcomeOf(query.data, query.error, t, tc);
  return { pending, ...outcome };
}
