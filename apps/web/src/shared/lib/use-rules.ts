import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const blank = (value: unknown): boolean => value == null || String(value).trim() === '';

/** Field rules with their messages in the language of the screen; each returns the message, or undefined when the value is fine. */
export function useRules() {
  const { t } = useTranslation();
  return useMemo(() => {
    const required = (value: unknown) => (blank(value) ? t('validation.required') : undefined);
    return {
      required,
      text: (min: number) => (value: string) => (blank(value) ? t('validation.required') : value.trim().length < min ? t('validation.minLength', { min }) : undefined),
      email: (value: string) => (blank(value) ? t('validation.required') : EMAIL.test(value.trim()) ? undefined : t('validation.email')),
      pattern: (regex: RegExp, message: string) => (value: string) => (blank(value) ? t('validation.required') : regex.test(value) ? undefined : message),
    };
  }, [t]);
}
