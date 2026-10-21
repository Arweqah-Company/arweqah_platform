import { ErrorPage } from '@/shared/ui';

/** Inside the app shell: an unknown address (404). */
export function NotFoundPage() {
  return <ErrorPage code={404} />;
}
