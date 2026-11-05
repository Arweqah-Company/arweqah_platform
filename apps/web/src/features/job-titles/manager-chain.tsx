import type { JobTitleCardDto, TitleChainStepDto } from '@arweqah-platform/shared';
import { Check, UserRound, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';

const STEP_LOOK: Record<TitleChainStepDto['state'], string> = {
  vacant: 'border-dashed border-neutral-500 text-muted',
  found: 'border-green-400 bg-green-50',
  blocked: 'border-danger-700 bg-danger-50',
};

const STEP_MARK: Record<TitleChainStepDto['state'], ReactNode> = {
  vacant: null,
  found: <Check className="size-4 text-success" aria-hidden />,
  blocked: <X className="size-4 text-danger-text" aria-hidden />,
};

function StepNote({ step }: { step: TitleChainStepDto }) {
  const { t } = useTranslation('job-titles');
  if (step.state === 'vacant') return <>{t('chain.vacant')}</>;
  if (step.state === 'blocked') return <>{t('chain.blocked')}</>;
  return <>{step.managerName ? t('chain.found', { name: step.managerName, count: step.count ?? 0 }) : t('chain.foundCount', { count: step.count ?? 0 })}</>;
}

function Step({ step, last }: { step: TitleChainStepDto; last: boolean }) {
  const { t, i18n } = useTranslation('job-titles');
  const ar = i18n.language === 'ar';
  return (
    <li data-state={step.state} className="flex gap-3">
      <div aria-hidden className="flex flex-col items-center">
        <span className={cn('grid size-7 shrink-0 place-items-center rounded-full border-2 bg-white', STEP_LOOK[step.state])}>{STEP_MARK[step.state]}</span>
        {!last && <span className="w-0.5 grow bg-neutral-200" />}
      </div>
      <div className={cn('mb-3 min-w-0 flex-1 rounded-2xl border px-3 py-2', STEP_LOOK[step.state])}>
        <p className="flex flex-wrap items-center gap-2 text-sm"><b className="text-fg">{(ar ? step.nameAr : step.nameEn) || step.nameAr}</b>{step.code && <Badge><span dir="ltr">{step.code}</span></Badge>}</p>
        <p className="text-xs">{(ar ? step.unitNameAr : step.unitNameEn) || step.unitNameAr} · <StepNote step={step} /></p>
        <span className="sr-only">{t(`chain.state.${step.state}`)}</span>
      </div>
    </li>
  );
}

/** «Who is the direct manager?»: the employee, then each higher title with what happened to it (skipped, found, out of reach). */
export function ManagerChain({ card, companyName }: { card: JobTitleCardDto; companyName: string }) {
  const { t, i18n } = useTranslation('job-titles');
  const chain = card.chain;
  if (!chain) return <p className="text-sm text-muted">{t('chain.noCompany')}</p>;
  const name = (i18n.language === 'ar' ? card.nameAr : card.nameEn) || card.nameAr;
  return (
    <div className="flex flex-col gap-3">
      <ol aria-label={t('chain.label')} className="flex flex-col">
        <li className="flex gap-3">
          <div aria-hidden className="flex flex-col items-center">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-on-primary"><UserRound className="size-4" /></span>
            {chain.steps.length > 0 && <span className="w-0.5 grow bg-neutral-200" />}
          </div>
          <div className="mb-3 min-w-0 flex-1 px-1 py-1"><b className="text-sm">{name}</b><p className="text-xs text-muted">{t('chain.employeeOf', { company: companyName })}</p></div>
        </li>
        {chain.steps.map((step, index) => <Step key={step.id} step={step} last={index === chain.steps.length - 1} />)}
      </ol>
      {chain.managerTitleId === null && <Alert tone="danger">{t('chain.none')}</Alert>}
    </div>
  );
}
