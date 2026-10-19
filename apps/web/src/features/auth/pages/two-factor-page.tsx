import { useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { authClient } from '@/core/auth/auth-client';
import { Alert, Button, FormField, Input } from '@/shared/ui';
import { AuthShell } from './auth-shell';

export function TwoFactorPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const client = useQueryClient();
  const [code, setCode] = useState('');
  const [trust, setTrust] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await authClient.twoFactor.verifyTotp({ code, trustDevice: trust });
    if (res.error) return setError(t('invalidCode'));
    await client.invalidateQueries();
    navigate('/', { replace: true });
  };

  return (
    <AuthShell title={t('twoFactorTitle')} subtitle={t('twoFactorHint')}>
      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        {error && <Alert>{error}</Alert>}
        <FormField label={t('code')}>
          {(p) => (
            <Input {...p} value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} dir="ltr" />
          )}
        </FormField>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={trust} onChange={(e) => setTrust(e.target.checked)} />
          {t('trustDevice')}
        </label>
        <Button type="submit" disabled={code.length !== 6}>
          {t('verify')}
        </Button>
      </form>
    </AuthShell>
  );
}
