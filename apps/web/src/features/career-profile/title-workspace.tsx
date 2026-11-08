import { careerContentSchema, careerReadinessProblems, CorePermission, type CareerContent, type CareerTitleListItemDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ApiError } from '@/core/api/api-client';
import { usePermissions } from '@/core/permissions/can';
import { Alert, Button, Dialog, DialogFooter, Tabs } from '@/shared/ui';
import { useSaveContent, useTitleContent } from './api';
import { StatusBadge } from './content-columns';
import { CompetenciesEditor } from './editors/competencies-editor';
import { DescriptionEditor } from './editors/description-editor';
import { LearningEditor } from './editors/learning-editor';
import { PathEditor } from './editors/path-editor';
import { RequiredEditor } from './editors/required-editor';
import { FreeReading } from './free-reading';
import type { TitleDialogState } from './title-dialogs';
import { TitleRowActions } from './title-row-actions';

const TABS = ['description', 'path', 'competencies', 'learning', 'required', 'evaluation', 'lists'] as const;
type WorkspaceTab = (typeof TABS)[number];

/** What still stops the path from being set ready, live as the document is edited (the same list the server checks). */
function Readiness({ content }: { content: CareerContent }) {
  const { t } = useTranslation('career-profile');
  const problems = careerReadinessProblems(content);
  if (problems.length === 0) return <Alert tone="success">{t('workspace.complete')}</Alert>;
  return (
    <Alert tone="warning">
      <b>{t('workspace.cannotBeReady')}</b>
      <ul className="mt-1 list-disc ps-5">{problems.map((p) => <li key={p}>{t(`workspace.problems.${p}`)}</li>)}</ul>
    </Alert>
  );
}

function EditorFor({ tab, content, onChange }: { tab: WorkspaceTab; content: CareerContent; onChange: (next: CareerContent) => void }) {
  const { t } = useTranslation('career-profile');
  switch (tab) {
    case 'description': return <DescriptionEditor content={content} onChange={onChange} />;
    case 'path': return <PathEditor content={content} onChange={onChange} />;
    case 'competencies': return <CompetenciesEditor content={content} onChange={onChange} />;
    case 'learning': return <LearningEditor content={content} onChange={onChange} />;
    case 'required': return <RequiredEditor content={content} onChange={onChange} />;
    case 'evaluation': return <Alert tone="info">{t('workspace.evaluationNote')}</Alert>;
    case 'lists': return <Alert tone="info">{t('workspace.listsNote')}</Alert>;
  }
}

/** The list of what is missing, then the tab: the editor for a person who may edit, the read-only path for one who may only see. */
function WorkspaceBody({ content, tab, canEdit, onChange }: { content: CareerContent; tab: WorkspaceTab; canEdit: boolean; onChange: (next: CareerContent) => void }) {
  return (
    <>
      <Readiness content={content} />
      <div className="mt-3">{canEdit ? <EditorFor tab={tab} content={content} onChange={onChange} /> : <FreeReading content={content} preview />}</div>
    </>
  );
}

/** The edited copy of a title's document: what it says now, whether it changed and is valid, and saving it on the version it was read at. */
function useWorkspaceDocument(titleId: string) {
  const { t } = useTranslation('career-profile');
  const stored = useTitleContent(titleId);
  const save = useSaveContent(titleId);
  const [draft, setDraft] = useState<CareerContent | null>(null);
  const content = draft ?? stored.data?.content;
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(stored.data?.content);
  const valid = !!content && careerContentSchema.safeParse(content).success;
  const submit = () => draft && stored.data && save.mutate({ content: draft, expectedVersion: stored.data.version }, { onSuccess: () => { toast.success(t('workspace.saved')); setDraft(null); } });
  return { stored, save, content, setDraft, dirty, valid, submit, stale: save.error instanceof ApiError && save.error.status === 409 };
}

/** The messages under the editor: the content changed meanwhile, the save failed, or a field is not valid. */
function Notices({ doc }: { doc: ReturnType<typeof useWorkspaceDocument> }) {
  const { t } = useTranslation('career-profile');
  const message = doc.stale ? 'workspace.stale' : doc.save.isError ? 'workspace.saveFailed' : doc.dirty && !doc.valid ? 'workspace.invalid' : null;
  return message ? <div className="mt-3"><Alert tone={doc.dirty && !doc.valid && !doc.save.isError ? 'warning' : 'danger'}>{t(message)}</Alert></div> : null;
}

/** The workspace of one title: its path in seven tabs, the five that hold content edited field by field (saved with «Save»), and the live list of what is missing. */
export function TitleWorkspace({ title, onClose, onAction }: { title: CareerTitleListItemDto; onClose: () => void; onAction: (state: TitleDialogState) => void }) {
  const { t, i18n } = useTranslation('career-profile');
  const canEdit = usePermissions().can(CorePermission.CareerContentEdit);
  const doc = useWorkspaceDocument(title.id);
  const [tab, setTab] = useState<WorkspaceTab>('description');
  const name = (i18n.language === 'ar' ? title.nameAr : title.nameEn) || title.nameAr;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('workspace.title', { name })} description={title.code ?? undefined} xl>
      <div className="mb-3 flex flex-wrap items-center gap-2"><StatusBadge status={title.status} /><TitleRowActions title={title} first={false} onOpen={onAction} /></div>
      {doc.stored.isError && <Alert tone="danger">{t('preview.failed')}</Alert>}
      <div className="mt-3"><Tabs tabs={TABS.map((id) => ({ id, label: t(`workspace.tabs.${id}`) }))} value={tab} label={t('workspace.tabsLabel')} onChange={setTab} /></div>
      {doc.content && <WorkspaceBody content={doc.content} tab={tab} canEdit={canEdit} onChange={doc.setDraft} />}
      <Notices doc={doc} />
      <DialogFooter>
        {canEdit && <Button disabled={!doc.dirty || !doc.valid || doc.save.isPending} onClick={doc.submit}>{t('workspace.save')}</Button>}
        <Button variant="secondary" onClick={onClose}>{t('file.close')}</Button>
      </DialogFooter>
    </Dialog>
  );
}
