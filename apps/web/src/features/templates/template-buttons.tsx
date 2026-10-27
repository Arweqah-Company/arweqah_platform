import type { TemplateContent, TemplateDto, TemplateKind, TemplateLang } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useMe } from '@/core/auth/session';
import { ApiError } from '@/core/api/api-client';
import { usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Button, ConfirmDialog } from '@/shared/ui';
import { useApproveTemplate, useRejectTemplate, useResetTemplate, useSaveTemplate, useSendTemplateTest } from './api';
import { KIND_KEYS } from './keys';

interface Props {
  kind: TemplateKind;
  template: TemplateDto;
  content: TemplateContent;
  lang: TemplateLang;
  requireApproval: boolean;
  readOnly: boolean;
  onClose: () => void;
}

/** A problem the server found in the wording, said with the variables it named. */
function problem(tc: ReturnType<typeof useTranslation>['t'], language: string, error: unknown): string {
  const variables = error instanceof ApiError ? (error.details as { variables?: string[] } | undefined)?.variables : undefined;
  if (!variables?.length) return errorMessage(tc, error);
  return `${errorMessage(tc, error)} (${new Intl.ListFormat(language, { type: 'conjunction' }).format(variables.map((v) => `@${v}`))})`;
}

/** What can be done with the wording being edited, each only for who holds its permission. */
function useActions({ kind, template, content, lang, onClose }: Props) {
  const { t, i18n } = useTranslation('templates');
  const { t: tc } = useTranslation();
  const mutations = { save: useSaveTemplate(kind), reset: useResetTemplate(kind), approve: useApproveTemplate(kind), reject: useRejectTemplate(kind), test: useSendTemplateTest() };
  /** `done` is the message shown on success, or a function of what the work returned. */
  const run = async <T,>(work: () => Promise<T>, done: string | ((result: T) => string), close = true) => {
    try {
      const result = await work();
      toast.success(typeof done === 'function' ? done(result) : done);
      if (close) onClose();
    } catch (error) {
      toast.error(problem(tc, i18n.language, error));
    }
  };
  const sendTest = async () => {
    const sent = await mutations.test.mutateAsync({ key: template.key, content, lang });
    return t('test.sent', { to: sent.sentTo });
  };
  return {
    mutations,
    save: (done: string) => run(() => mutations.save.mutateAsync({ key: template.key, content }), done),
    test: () => run(sendTest, (message) => message, false),
    reset: () => run(() => mutations.reset.mutateAsync(template.key), t('saved.reset')),
    approve: () => run(() => mutations.approve.mutateAsync(template.key), t('saved.approved')),
    reject: () => run(() => mutations.reject.mutateAsync({ key: template.key, note: '' }), t('saved.rejected')),
  };
}

function ApprovalButtons({ props, act }: { props: Props; act: ReturnType<typeof useActions> }) {
  const { t } = useTranslation('templates');
  const mine = props.template.pending?.submittedById === useMe().data?.id;
  return (
    <>
      <Button disabled={mine || act.mutations.approve.isPending} onClick={() => void act.approve()}>{t('actions.approve')}</Button>
      <Button variant="danger" disabled={act.mutations.reject.isPending} onClick={() => void act.reject()}>{t('actions.reject')}</Button>
      {mine && <p className="basis-full text-sm text-muted">{t('pending.ownChange')}</p>}
    </>
  );
}

/** Which buttons the person sees: what they may do, and what makes sense for this message right now. */
function visibleActions(props: Props, can: (key: string) => boolean) {
  const keys = KIND_KEYS[props.kind];
  const complete = (['ar', 'en'] as const).every((l) => props.content[l].title.trim() && props.content[l].body.trim());
  return {
    complete,
    save: !props.readOnly,
    test: props.kind === 'email' && !!keys.test && can(keys.test),
    reset: can(keys.reset) && props.template.status !== 'default',
    approval: !!props.template.pending && can(keys.approve),
  };
}

export function TemplateButtons(props: Props) {
  const { t } = useTranslation('templates');
  const { t: tc } = useTranslation();
  const show = visibleActions(props, usePermissions().can);
  const act = useActions(props);
  const [resetting, setResetting] = useState(false);
  const saveLabel = props.requireApproval ? t('actions.submit') : tc('actions.save');
  const savedText = props.requireApproval ? t('saved.submitted') : t('saved.live');
  return (
    <div className="flex flex-wrap gap-2">
      {show.save && <Button disabled={!show.complete || act.mutations.save.isPending} onClick={() => void act.save(savedText)}>{saveLabel}</Button>}
      {show.test && <Button variant="secondary" disabled={!show.complete || act.mutations.test.isPending} onClick={() => void act.test()}>{t('actions.test')}</Button>}
      {show.reset && <Button variant="secondary" onClick={() => setResetting(true)}>{t('actions.reset')}</Button>}
      {show.approval && <ApprovalButtons props={props} act={act} />}
      <ConfirmDialog open={resetting} onOpenChange={setResetting} title={t('reset.title')} description={t('reset.description')} confirmLabel={t('actions.reset')} tone="danger" busy={act.mutations.reset.isPending} onConfirm={() => act.reset()} />
    </div>
  );
}
