import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useReach } from '@/core/permissions/use-access';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, FormField, Select } from '@/shared/ui';
import { CorePermission } from '@arweqah-platform/shared';
import { useMatrix } from '../api';
import { MatrixQuadrantPanel } from './matrix-quadrant';

/** The people's choice: my own open tasks, or those of the people my matrix key reaches (offered only when it reaches beyond me). */
function ScopeSelect({ value, onChange }: { value: 'mine' | 'team'; onChange: (value: 'mine' | 'team') => void }) {
  const { t } = useTranslation('tasks');
  return (
    <FormField label={t('matrix.scope')}>
      {(p) => (
        <Select {...p} className="max-w-64" value={value} onChange={(e) => onChange(e.target.value as 'mine' | 'team')}>
          <option value="mine">{t('matrix.mine')}</option>
          <option value="team">{t('matrix.team')}</option>
        </Select>
      )}
    </FormField>
  );
}

/** The same open tasks in four squares: important or not, urgent or not. A section of the home page. */
export function MatrixSection() {
  const { t } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const [scope, setScope] = useState<'mine' | 'team'>('mine');
  const reach = useReach(CorePermission.TasksMatrixView);
  const query = useMatrix(scope);
  return (
    <section aria-labelledby="home-matrix" className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="home-matrix" className="text-lg font-bold">{t('matrix.title')}</h2>
          <p className="max-w-[70ch] text-sm text-muted">{t('matrix.description')}</p>
        </div>
        {reach && reach !== 'own' && <ScopeSelect value={scope} onChange={setScope} />}
      </div>
      {query.isError && <Alert>{errorMessage(tc, query.error)}</Alert>}
      {query.isPending && <div role="status" aria-label={t('loading')} className="h-40 animate-pulse rounded-3xl bg-neutral-50" />}
      <div className="grid gap-4 lg:grid-cols-2">
        {query.data?.quadrants.map((q) => <MatrixQuadrantPanel key={q.key} id={q.key} total={q.total} items={q.items} />)}
      </div>
    </section>
  );
}
