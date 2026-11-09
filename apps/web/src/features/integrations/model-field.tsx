import { CorePermission, type ProviderKey } from '@arweqah-platform/shared';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Combobox, FormField, Input } from '@/shared/ui';
import { useAiModels, type SentValues } from './api';

interface Props {
  providerKey: ProviderKey;
  label: string;
  required: boolean;
  hint: string | undefined;
  error: string | undefined;
  value: string;
  disabled: boolean;
  /** What is in the form: the key and the address the list is asked with. */
  sent: SentValues;
  onChange: (value: string) => void;
  onBlur: () => void;
}

type ModelList = ReturnType<typeof useAiModels>;

/** The names the service offered, plus the model now in the form when it is not among them (a typed name stays pickable). */
const namesOf = (list: ModelList, value: string): string[] | null => {
  const names = list.data?.ok ? list.data.models : null;
  return names && value && !names.includes(value) ? [value, ...names] : names;
};

/** Asking the service for its models, and how many it offered. */
function ListControls({ providerKey, sent, list, count, disabled }: { providerKey: ProviderKey; sent: SentValues; list: ModelList; count: number | null; disabled: boolean }) {
  const { t } = useTranslation('integrations');
  return (
    <Can permission={CorePermission.IntegrationsAiTest}>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" disabled={disabled || list.isPending} onClick={() => list.mutate({ providerKey, values: sent })}>
          {list.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {t(count === null ? 'models.load' : 'models.reload')}
        </Button>
        {count !== null && <span role="status" className="text-sm text-muted">{t('models.count', { count })}</span>}
      </div>
    </Can>
  );
}

/** Why the models could not be listed: the service's words, or the platform's refusal. */
function ListProblem({ list }: { list: ModelList }) {
  const { t } = useTranslation('integrations');
  const { t: tc } = useTranslation();
  if (list.isError) return <Alert>{errorMessage(tc, list.error)}</Alert>;
  if (!list.data || list.data.ok) return null;
  return <Alert>{t('models.failed')}: <span dir="auto" className="break-words">{list.data.message ?? t('test.failed')}</span></Alert>;
}

/**
 * The model of an AI service: a text box until the person asks the service for its models, then a pick list with search (the names are the
 * service's own). A service that cannot be asked says why and the box stays, so nobody is stuck behind it.
 */
export function ModelField({ providerKey, label, required, hint, error, value, disabled, sent, onChange, onBlur }: Props) {
  const list = useAiModels();
  // The list belongs to the key and the address it was asked with: another key or address makes it stale (the model picked does not).
  const asked = JSON.stringify([sent.apiKey ?? null, sent.baseUrl ?? null]);
  useEffect(() => list.reset(), [asked]); // eslint-disable-line react-hooks/exhaustive-deps
  const names = namesOf(list, value);
  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <FormField label={required ? `${label} *` : label} error={error} hint={hint}>
        {(p) =>
          names ? (
            <Combobox id={p.id} label={label} value={value} options={names.map((name) => ({ value: name, label: name }))} disabled={disabled} onChange={(next) => onChange(next ?? '')} onBlur={onBlur} />
          ) : (
            <Input {...p} dir="ltr" disabled={disabled} autoComplete="off" spellCheck={false} aria-required={required} value={value} onBlur={onBlur} onChange={(e) => onChange(e.target.value)} />
          )
        }
      </FormField>
      <ListControls providerKey={providerKey} sent={sent} list={list} count={names ? (list.data?.models.length ?? 0) : null} disabled={disabled} />
      <ListProblem list={list} />
    </div>
  );
}
