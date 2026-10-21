import { ErrorPage } from '@/shared/ui';

/** Outside the app shell: the session ended while the person was working (401). */
export function SessionEndedPage() {
  return <ErrorPage code={401} fullScreen />;
}
