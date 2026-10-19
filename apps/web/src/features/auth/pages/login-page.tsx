import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { z } from 'zod';
import { authClient } from '@/core/auth/auth-client';
import { Alert, Button, FormField, Input } from '@/shared/ui';
import { AuthShell } from './auth-shell';

const schema = z.object({ email: z.email(), password: z.string().min(1) });
type Form = z.infer<typeof schema>;
const microsoftEnabled = import.meta.env.VITE_MICROSOFT_ENABLED === 'true';

export function LoginPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const location = useLocation();
  const client = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<Form>({ resolver: zodResolver(schema) });
  const target = (location.state as { from?: string } | null)?.from ?? '/';

  const onSubmit = async (values: Form) => {
    setError(null);
    const res = await authClient.signIn.email(values);
    if (res.error) {
      setError(res.error.status === 429 ? t('tooMany') : t('invalid'));
      return;
    }
    await client.invalidateQueries();
    if (!('twoFactorRedirect' in (res.data ?? {}))) navigate(target, { replace: true });
  };

  return (
    <AuthShell title={t('title')} subtitle={t('subtitle')}>
      {microsoftEnabled && (
        <>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => void authClient.signIn.social({ provider: 'microsoft', callbackURL: window.location.origin + target })}
          >
            {t('microsoft')}
          </Button>
          <p className="my-5 text-center text-xs text-muted">{t('or')}</p>
        </>
      )}
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {error && <Alert>{error}</Alert>}
        <FormField label={t('email')} error={formState.errors.email && t('invalid')}>
          {(p) => <Input {...p} type="email" autoComplete="username" dir="ltr" {...register('email')} />}
        </FormField>
        <FormField label={t('password')}>
          {(p) => <Input {...p} type="password" autoComplete="current-password" dir="ltr" {...register('password')} />}
        </FormField>
        <Button type="submit" disabled={formState.isSubmitting} className="mt-2">
          {t('submit')}
        </Button>
      </form>
    </AuthShell>
  );
}
