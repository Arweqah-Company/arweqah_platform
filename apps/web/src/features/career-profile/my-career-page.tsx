import type { MyCareerProfileDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { Route } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, EmptyState, PageHeader } from '@/shared/ui';
import { useMyCareer } from './api';
import { FreeReading } from './free-reading';
import { ReadingFlow } from './reading-flow';
import { TitleHeader } from './title-header';

/** The path as it was when the reading began: a newer version fetched meanwhile must not be acknowledged as if it had been read. */
function ReadingSession({ me }: { me: MyCareerProfileDto }) {
  const [read] = useState(me);
  return <><TitleHeader me={read} /><ReadingFlow me={read} /></>;
}

function PathBody({ me }: { me: MyCareerProfileDto }) {
  const { t } = useTranslation('career-profile');
  if (!me.available) return <EmptyState icon={Route} title={t('page.notReady')} description={t('page.notReadyHint')} />;
  if (me.ackRequired) return <ReadingSession key={me.titleId} me={me} />;
  return <><TitleHeader me={me} /><FreeReading content={me.content as NonNullable<typeof me.content>} stage={me.stage} /></>;
}

/** «My career path»: the path of the title the person holds, read in order until acknowledged and freely afterwards. */
export function MyCareerPage() {
  const { t } = useTranslation('career-profile');
  const me = useMyCareer();
  const acknowledged = me.data?.available && !me.data.ackRequired && me.data.acknowledgedVersion;
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('page.title')} description={t('page.description')} actions={acknowledged ? <Badge tone="success">{t('page.acknowledged', { version: me.data?.acknowledgedVersion })}</Badge> : undefined} />
      {me.isError && <Alert tone="danger">{t('page.loadFailed')}</Alert>}
      {me.data && <PathBody me={me.data} />}
    </div>
  );
}
