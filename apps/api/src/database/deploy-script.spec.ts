import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const DEPLOY = resolve(__dirname, '../../../../scripts/server/deploy.sh');

/** Runs the real deploy.sh in a scratch copy of the repo layout, with a fake `docker` (it only logs) and a `backup.sh` that succeeds or fails. */
function runDeploy(opts: { backupExit: number; apiRunning: boolean }): { status: number | null; commands: string } {
  const root = mkdtempSync(join(tmpdir(), 'deploy-'));
  mkdirSync(join(root, 'scripts/server'), { recursive: true });
  mkdirSync(join(root, 'bin'));
  copyFileSync(DEPLOY, join(root, 'scripts/server/deploy.sh'));
  writeFileSync(join(root, 'scripts/server/backup.sh'), `#!/usr/bin/env bash\necho backup >> "${root}/log"\nexit ${opts.backupExit}\n`);
  writeFileSync(join(root, '.env'), 'TAG=old\n');
  writeFileSync(join(root, 'docker-compose.prod.yml'), '');
  writeFileSync(join(root, 'bin/docker'), `#!/usr/bin/env bash\necho "$*" >> "${root}/log"\n${opts.apiRunning ? 'if [[ "$*" == *"ps "* ]]; then echo api; fi' : ''}\nexit 0\n`);
  chmodSync(join(root, 'bin/docker'), 0o755);
  const run = spawnSync('bash', [join(root, 'scripts/server/deploy.sh'), 'tag1'], { env: { ...process.env, PATH: `${join(root, 'bin')}:${process.env.PATH}` }, encoding: 'utf8' });
  let commands = '';
  try { commands = readFileSync(join(root, 'log'), 'utf8'); } catch { /* nothing ran */ }
  return { status: run.status, commands };
}

describe('scripts/server/deploy.sh: the backup before the migrations (the rebuild migration deletes data)', () => {
  it('stops before the migrations when the backup of a running server fails', () => {
    const run = runDeploy({ backupExit: 1, apiRunning: true });
    expect(run.status).not.toBe(0);
    expect(run.commands).not.toContain('migration:run');
  });

  it('runs the migrations after a good backup', () => {
    const run = runDeploy({ backupExit: 0, apiRunning: true });
    expect(run.status).toBe(0);
    expect(run.commands.indexOf('backup')).toBeLessThan(run.commands.indexOf('migration:run'));
  });

  it('does not need a backup on a first deploy, when no API container is running yet', () => {
    const run = runDeploy({ backupExit: 1, apiRunning: false });
    expect(run.status).toBe(0);
    expect(run.commands).toContain('migration:run');
  });
});
