import { DEFAULT_WORK_EMAIL_DOMAIN, emailDomainSchema } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, FormField, Textarea } from '@/shared/ui';
import { useEmailDomains, useSaveEmailDomains } from './api';
import { SECURITY_SETTINGS_KEYS } from './keys';

/** One domain per line, as typed: blank lines go, and what is not a domain is named so it can be fixed. */
export function parseDomains(text: string): { domains: string[]; bad: string[] } {
  const lines = text.split(/[\n,]/).map((l) => l.trim().toLowerCase()).filter(Boolean);
  const bad = lines.filter((l) => !emailDomainSchema.safeParse(l).success);
  return { domains: [...new Set(lines.filter((l) => !bad.includes(l)))], bad };
}

/** The domains work e-mails may use. While the list is empty only the default domain is allowed. */
export function EmailDomainsCard() {
  const { t } = useTranslation('security');
  const { t: tc } = useTranslation();
  const domains = useEmailDomains();
  if (domains.isError) return <Alert>{errorMessage(tc, domains.error)}</Alert>;
  if (!domains.data) return <p role="status" className="mt-4 text-sm text-muted">{t('settings.loading')}</p>;
  return <DomainsForm initial={domains.data.domains} />;
}

function DomainsForm({ initial }: { initial: string[] }) {
  const { t } = useTranslation('security');
  const { t: tc } = useTranslation();
  const canEdit = usePermissions().can(SECURITY_SETTINGS_KEYS.edit);
  const save = useSaveEmailDomains();
  const [text, setText] = useState(initial.join('\n'));
  const parsed = parseDomains(text);
  const submit = async () => {
    try {
      await save.mutateAsync(parsed.domains);
      toast.success(t('domains.saved'));
    } catch {
      /* shown below */
    }
  };
  return (
    <div className="mt-4 flex max-w-xl flex-col gap-4 rounded-[var(--radius-panel)] border border-neutral-200 bg-white p-5">
      {save.isError && <Alert>{errorMessage(tc, save.error)}</Alert>}
      <FormField label={t('domains.label')} hint={t('domains.hint', { default: DEFAULT_WORK_EMAIL_DOMAIN })} error={parsed.bad.length ? t('domains.bad', { list: parsed.bad.join(', ') }) : undefined}>
        {(p) => <Textarea {...p} dir="ltr" rows={4} disabled={!canEdit} value={text} onChange={(e) => setText(e.target.value)} placeholder={DEFAULT_WORK_EMAIL_DOMAIN} />}
      </FormField>
      {canEdit && <div className="flex justify-end"><Button disabled={parsed.bad.length > 0 || save.isPending} onClick={() => void submit()}>{tc('actions.save')}</Button></div>}
    </div>
  );
}
