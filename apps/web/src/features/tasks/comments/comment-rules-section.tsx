import { COMMENT_ACTIONS, COMMENT_RELATIONS, CorePermission, OUTSIDE_RELATIONS, type CommentAction, type CommentRelation, type CommentRuleMatrix, type CommentRulesDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can, usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button } from '@/shared/ui';
import { useCommentRules, useSaveCommentRules } from './comments.api';

const withCell = (m: CommentRuleMatrix, relation: CommentRelation, action: CommentAction, on: boolean): CommentRuleMatrix => ({ ...m, [relation]: { ...m[relation], [action]: on } });

/** The table of cells: a row per relation to the task, a column per action; the person who may not edit only reads it. */
function Cells({ matrix, onChange, readOnly }: { matrix: CommentRuleMatrix; onChange: (m: CommentRuleMatrix) => void; readOnly: boolean }) {
  const { t } = useTranslation('tasks');
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-sm">
        <thead>
          <tr className="bg-neutral-50 text-start text-xs text-muted">
            <th scope="col" className="px-3 py-2 text-start font-medium">{t('commentRules.relation')}</th>
            {COMMENT_ACTIONS.map((a) => <th key={a} scope="col" className="px-3 py-2 text-center font-medium">{t(`commentRules.actions.${a}`)}</th>)}
          </tr>
        </thead>
        <tbody>
          {COMMENT_RELATIONS.map((relation) => (
            <tr key={relation} className="border-t border-neutral-200">
              <th scope="row" className="px-3 py-2 text-start font-medium">{t(`commentRules.relations.${relation}`)}{OUTSIDE_RELATIONS.includes(relation) && <span aria-hidden className="text-muted"> *</span>}</th>
              {COMMENT_ACTIONS.map((action) => (
                <td key={action} className="px-3 py-2 text-center">
                  <input type="checkbox" className="size-5 accent-petrol-800" disabled={readOnly} checked={matrix[relation][action]} aria-label={t('commentRules.cell', { relation: t(`commentRules.relations.${relation}`), action: t(`commentRules.actions.${action}`) })} onChange={(e) => onChange(withCell(matrix, relation, action, e.target.checked))} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RulesForm({ rules }: { rules: CommentRulesDto }) {
  const { t } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const save = useSaveCommentRules(rules.companyId);
  const [matrix, setMatrix] = useState(rules.rules);
  const canEdit = usePermissions().can(CorePermission.TasksCommentRulesEdit);
  const submit = async () => {
    try {
      await save.mutateAsync({ rules: matrix });
      toast.success(t('commentRules.saved'));
    } catch {
      /* shown above the table */
    }
  };
  return (
    <div className="flex flex-col gap-3">
      {save.isError && <Alert>{errorMessage(tc, save.error)}</Alert>}
      <Cells matrix={matrix} onChange={setMatrix} readOnly={!canEdit} />
      <p className="text-xs text-muted">* {t('commentRules.outsiderNote')}</p>
      <Can permission={CorePermission.TasksCommentRulesEdit}><div className="flex justify-end"><Button disabled={save.isPending} onClick={() => void submit()}>{tc('actions.save')}</Button></div></Can>
    </div>
  );
}

/** Who may do what in the conversations of a company's tasks (the second half of the task policies page). */
export function CommentRulesSection({ companyId }: { companyId: string }) {
  const { t } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const query = useCommentRules(companyId);
  return (
    <section aria-labelledby="comment-rules-title" className="rounded-[var(--radius-panel)] border border-neutral-200 bg-white p-6 shadow-sm shadow-ink/5">
      <h2 id="comment-rules-title" className="text-lg font-bold">{t('commentRules.title')}</h2>
      <p className="mb-4 mt-1 text-sm text-muted">{t('commentRules.hint')}</p>
      {query.isError && <Alert>{errorMessage(tc, query.error)}</Alert>}
      {query.data && <RulesForm key={query.data.companyId} rules={query.data} />}
    </section>
  );
}
