import { CorePermission } from '@arweqah-platform/shared';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { myCareer } from '../../../test/career-fixtures';
import { me, server } from '../../../test/msw';
import { renderRoute } from '../../../test/render';
import { CareerGate } from './career-gate';

function open(path: string, profile = myCareer(), keys: string[] = [CorePermission.CareerProfileView], adminMode = false) {
  const person = me(keys.map((key) => ({ key, scope: 'all' as const })), { adminMode });
  server.use(http.get('*/api/me', () => HttpResponse.json(person)), http.get('*/api/career-profile/me', () => HttpResponse.json(profile)));
  const page = (text: string) => <CareerGate><p>{text}</p></CareerGate>;
  renderRoute([{ path: '/', element: page('home page') }, { path: '/tasks', element: page('tasks page') }, { path: '/career-profile', element: page('career path page') }], path);
}

describe('The platform is held back until the career path is acknowledged (FR-112)', () => {
  it('sends every other page to the career path while the acknowledgement is required', async () => {
    open('/tasks');
    expect(await screen.findByText('career path page')).toBeInTheDocument();
    expect(screen.queryByText('tasks page')).not.toBeInTheDocument();
  });

  it('leaves the career path page itself open', async () => {
    open('/career-profile');
    expect(await screen.findByText('career path page')).toBeInTheDocument();
  });

  it('holds nobody back once acknowledged, when the path is not ready, or without the key to see it', async () => {
    open('/tasks', myCareer({ ackRequired: false, ackReason: null }));
    expect(await screen.findByText('tasks page')).toBeInTheDocument();
  });

  it('does not hold back a person who cannot open the career path (no key, nothing to read)', async () => {
    open('/tasks', myCareer(), []);
    expect(await screen.findByText('tasks page')).toBeInTheDocument();
  });

  it('holds the system account back like anyone while platform admin mode is off', async () => {
    open('/tasks', myCareer({ adminModeExempt: true }), [CorePermission.CareerProfileView], false);
    expect(await screen.findByText('career path page')).toBeInTheDocument();
    expect(screen.queryByText('tasks page')).not.toBeInTheDocument();
  });

  it('lets the system account work while platform admin mode is on, and only that account', async () => {
    open('/tasks', myCareer({ adminModeExempt: true }), [CorePermission.CareerProfileView], true);
    expect(await screen.findByText('tasks page')).toBeInTheDocument();
  });
});

describe('Admin mode does not lift the hold of an ordinary employee (FR-112)', () => {
  it('still sends an employee to the career path with admin mode on', async () => {
    open('/tasks', myCareer({ adminModeExempt: false }), [CorePermission.CareerProfileView], true);
    expect(await screen.findByText('career path page')).toBeInTheDocument();
  });
});
