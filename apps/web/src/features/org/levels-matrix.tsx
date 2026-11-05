import { ROOT_PARENT } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui';
import { isFixedPair, type LevelsDraft } from './levels-draft';

interface Props {
  draft: LevelsDraft;
  onToggle: (parent: string, child: string, on: boolean) => void;
  onToggleRow: (parent: string) => void;
}

/** The «who may be created under whom» table: a row per parent (the group first), a column per type, a box where creating that child under that parent is allowed. Fixed rules stay unticked and disabled. */
export function LevelsMatrix({ draft, onToggle, onToggleRow }: Props) {
  const { t } = useTranslation('org');
  const name = (key: string) => (key === ROOT_PARENT ? t('chart.groupFull') : (draft.types.find((x) => x.key === key)?.nameAr.trim() || t('levels.newType')));
  const parents = [ROOT_PARENT, ...draft.types.map((x) => x.key)];
  return (
    <section aria-labelledby="levels-matrix" className="flex flex-col gap-3">
      <div>
        <h3 id="levels-matrix" className="font-bold">{t('levels.matrixTitle')}</h3>
        <p className="text-sm text-muted">{t('levels.matrixNote')}</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-neutral-200" tabIndex={0} role="region" aria-label={t('levels.matrixTitle')}>
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-muted">
            <tr className="border-b border-neutral-200">
              <th scope="col" className="px-3 py-3 text-start font-medium">{t('levels.parentChild')}</th>
              {draft.types.map((x) => <th key={x.key} scope="col" className="px-3 py-3 text-center font-medium">{name(x.key)}</th>)}
              <th scope="col" className="px-3 py-3"><span className="sr-only">{t('levels.all')}</span></th>
            </tr>
          </thead>
          <tbody>
            {parents.map((parent) => (
              <tr key={parent} className="border-b border-neutral-200/70 last:border-0">
                <th scope="row" className="px-3 py-2 text-start font-medium">{name(parent)}</th>
                {draft.types.map((child) => {
                  const fixed = isFixedPair(parent, child.key);
                  return (
                    <td key={child.key} className="px-3 py-2 text-center">
                      <input type="checkbox" className="size-5 accent-petrol-800" disabled={fixed} checked={!fixed && (draft.rules[parent] ?? []).includes(child.key)} aria-label={t('levels.pair', { parent: name(parent), child: name(child.key) })} onChange={(e) => onToggle(parent, child.key, e.target.checked)} />
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-end"><Button size="sm" variant="ghost" aria-label={t('levels.allUnder', { parent: name(parent) })} onClick={() => onToggleRow(parent)}>{t('levels.all')}</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="list-disc ps-5 text-sm text-muted"><li>{t('levels.fixedSector')}</li><li>{t('levels.fixedOffice')}</li><li>{t('levels.codeNote')}</li></ul>
    </section>
  );
}
