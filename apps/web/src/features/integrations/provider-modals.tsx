import type { IntegrationKind, ProviderDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { ProviderDialog } from './provider-dialog';
import { ProviderHelpDialog } from './provider-help-dialog';
import { TestDialog } from './test-dialog';

export interface Modal {
  type: 'edit' | 'help' | 'test';
  providerKey: string;
}

/** The popup opened from a row of the providers list: the form, the guide to get the data, or the test. */
export function ProviderModals({ kind, providers, modal, onClose }: { kind: IntegrationKind; providers: ProviderDto[]; modal: Modal | null; onClose: () => void }) {
  const { t } = useTranslation('integrations');
  const provider = providers.find((p) => p.providerKey === modal?.providerKey);
  if (!modal || !provider) return null;
  if (modal.type === 'help') return <ProviderHelpDialog providerKey={provider.providerKey} onClose={onClose} />;
  if (modal.type === 'test') return <TestDialog kind={kind} providerKey={provider.providerKey} providerName={t(`providers.${provider.providerKey}`)} onClose={onClose} />;
  return <ProviderDialog key={provider.providerKey} kind={kind} provider={provider} onClose={onClose} />;
}
