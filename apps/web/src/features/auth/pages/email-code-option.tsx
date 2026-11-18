import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CodeMethod } from '@arweqah-platform/shared';
import { Alert, Button } from '@/shared/ui';

const RESEND_SECONDS = 60;

/** The choice between the code of the app and the one e-mailed to the person, with the countdown before a new e-mail may be asked. */
export function useEmailCode(send: () => Promise<unknown>, clearCode: () => void) {
  const [method, setMethod] = useState<CodeMethod>('app');
  const [wait, setWait] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (wait <= 0) return undefined;
    const timer = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);
  const request = async () => {
    setFailed(false);
    try {
      await send();
      clearCode();
      setMethod('email');
      setWait(RESEND_SECONDS);
    } catch {
      setFailed(true);
    }
  };
  return { method, wait, failed, request, useApp: () => {
      clearCode();
      setMethod('app');
    } };
}

export type EmailCodeState = ReturnType<typeof useEmailCode>;

/** The link under the code boxes: ask for the e-mailed code, or go back to the app; the e-mailed mode also shows the resend button. */
export function EmailCodeOption({ state, disabled }: { state: EmailCodeState; disabled?: boolean }) {
  const { t } = useTranslation('auth');
  if (state.method === 'app') {
    return (
      <>
        {state.failed && <Alert>{t('emailCode.failed')}</Alert>}
        <button type="button" disabled={disabled} className="text-start text-sm text-link underline underline-offset-4" onClick={() => void state.request()}>{t('emailCode.use')}</button>
      </>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <Alert tone="info">{t('emailCode.sent')}</Alert>
      {state.failed && <Alert>{t('emailCode.failed')}</Alert>}
      <div className="flex items-center justify-between text-sm">
        <Button type="button" variant="ghost" size="sm" disabled={disabled || state.wait > 0} onClick={() => void state.request()}>{state.wait > 0 ? t('emailCode.resendIn', { count: state.wait }) : t('emailCode.resend')}</Button>
        <button type="button" className="text-link underline underline-offset-4" onClick={state.useApp}>{t('emailCode.useApp')}</button>
      </div>
    </div>
  );
}
