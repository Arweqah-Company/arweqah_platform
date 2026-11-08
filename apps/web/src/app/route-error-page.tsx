import { useRouteError } from 'react-router';
import { ErrorPage } from '@/shared/ui';

const messageOf = (error: unknown) => (error instanceof Error ? (error.stack ?? error.message) : typeof error === 'string' ? error : JSON.stringify(error));

/** Router `errorElement`: a crash while rendering or loading a route (500) instead of the library's default screen. */
export function RouteErrorPage() {
  const error = useRouteError();
  return <ErrorPage code={500} fullScreen detail={import.meta.env.DEV ? messageOf(error) : undefined} />;
}
