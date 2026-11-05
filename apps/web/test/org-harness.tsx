import type { OrgTreeDto } from '@arweqah-platform/shared';
import { http, HttpResponse, type RequestHandler } from 'msw';
import { OrgPage } from '../src/features/org/org-page';
import { levelsDto, orgTree } from './org-fixtures';
import { me, server } from './msw';
import { renderRoute } from './render';

interface Options {
  /** Permission keys the person holds besides `org.view` (the Employee baseline is always there). */
  keys?: string[];
  adminMode?: boolean;
  /** What `view=team` answers, and `view=full` (defaults to the same tree with `view: 'full'`). */
  team?: OrgTreeDto;
  full?: OrgTreeDto;
  /** The view the person has chosen before (the page remembers it). */
  view?: 'chart' | 'icicle' | 'table' | 'cards';
  /** More answers for the requests a tab or a dialog makes (leaders, versions, the card of a title). */
  handlers?: RequestHandler[];
  /** The address the page opens on (a link may carry `?unit=` and `?tab=`). */
  path?: string;
}

/** Mounts the organization page against a mocked API; returns the requests seen on `/api/org/tree`. */
export function openOrgPage({ keys = [], adminMode = false, team = orgTree(), full, view = 'table', handlers = [], path = '/' }: Options = {}) {
  window.localStorage.setItem('view:org', view);
  const asked: URLSearchParams[] = [];
  // Built first: `me(...)` also sets what `/api/me/access` answers, which must not depend on which request arrives first.
  const person = me(['org.view', ...keys].map((key) => ({ key, scope: 'all' as const })), { adminMode });
  server.use(
    http.get('*/api/me', () => HttpResponse.json(person)),
    http.get('*/api/org/tree', ({ request }) => {
      const params = new URL(request.url).searchParams;
      asked.push(params);
      return HttpResponse.json(params.get('view') === 'full' ? (full ?? { ...team, view: 'full' as const }) : team);
    }),
    http.get('*/api/org/levels', () => HttpResponse.json(levelsDto)),
    http.get('*/api/employees/managers', () => HttpResponse.json([])),
    ...handlers,
  );
  renderRoute([{ path: '/', element: <OrgPage /> }], path);
  return { asked };
}
