import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const DEPLOY = resolve(__dirname, '../../../../scripts/server/deploy.sh');

/** Runs the real deploy.sh in a scratch copy of the repo layout, with a fake `docker` (it only logs) and a `backup.sh` that succeeds or fails. */
type Db = 't' | 'f' | 'error';
function runDeploy(opts: { backupExit: number; db: Db }): { status: number | null; commands: string } {
  const root = mkdtempSync(join(tmpdir(), 'deploy-'));
  mkdirSync(join(root, 'scripts/server'), { recursive: true });
  mkdirSync(join(root, 'bin'));
  copyFileSync(DEPLOY, join(root, 'scripts/server/deploy.sh'));
  writeFileSync(join(root, 'scripts/server/backup.sh'), `#!/usr/bin/env bash\necho backup >> "${root}/log"\nexit ${opts.backupExit}\n`);
  writeFileSync(join(root, '.env'), 'TAG=old\n');
  writeFileSync(join(root, 'docker-compose.prod.yml'), '');
  writeFileSync(join(root, 'bin/docker'), `#!/usr/bin/env bash\necho "$*" >> "${root}/log"\nif [[ "$*" == *psql* ]]; then ${opts.db === 'error' ? 'echo boom >&2; exit 2' : `echo ${opts.db}`}; fi\nexit 0\n`);
  chmodSync(join(root, 'bin/docker'), 0o755);
  const run = spawnSync('bash', [join(root, 'scripts/server/deploy.sh'), 'tag1'], { env: { ...process.env, PATH: `${join(root, 'bin')}:${process.env.PATH}` }, encoding: 'utf8' });
  let commands = '';
  try { commands = readFileSync(join(root, 'log'), 'utf8'); } catch { /* nothing ran */ }
  return { status: run.status, commands };
}

describe('scripts/server/deploy.sh: the backup before the migrations (the rebuild migration deletes data)', () => {
  it('stops before the migrations when the backup of a database that holds data fails (even if the API is down)', () => {
    const run = runDeploy({ backupExit: 1, db: 't' });
    expect(run.status).not.toBe(0);
    expect(run.commands).not.toContain('migration:run');
  });

  it('runs the migrations after a good backup', () => {
    const run = runDeploy({ backupExit: 0, db: 't' });
    expect(run.status).toBe(0);
    expect(run.commands).toContain('backup');
    expect(run.commands).toContain('migration:run');
    expect(run.commands.indexOf('backup')).toBeLessThan(run.commands.indexOf('migration:run'));
  });

  it('needs no backup on a confirmed new database', () => {
    const run = runDeploy({ backupExit: 1, db: 'f' });
    expect(run.status).toBe(0);
    expect(run.commands).toContain('migration:run');
    expect(run.commands).not.toContain('backup');
  });

  it('stops when the database cannot be inspected: it is never treated as new', () => {
    const run = runDeploy({ backupExit: 0, db: 'error' });
    expect(run.status).not.toBe(0);
    expect(run.commands).not.toContain('migration:run');
  });
});
