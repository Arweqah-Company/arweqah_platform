#!/usr/bin/env node
// Production dependency audit gate: fails on any high or critical advisory that is not in scripts/audit-allowlist.json.
// An allowlisted advisory is a recorded, reasoned exception (docs/decisions.md); the gate warns when a fix appears so it can be removed.
// Usage: node scripts/audit-gate.mjs   (also used by `security-check.mjs --audit` and .github/workflows/security.yml)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BLOCKING = new Set(['high', 'critical']);
const allowed = new Map(JSON.parse(readFileSync(join(ROOT, 'scripts/audit-allowlist.json'), 'utf8')).map((e) => [e.advisory, e]));

function runAudit() {
  try {
    return execFileSync('npm', ['audit', '--omit=dev', '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  } catch (error) {
    if (error.stdout) return String(error.stdout); // npm audit exits 1 when it finds advisories
    throw error;
  }
}

const advisoryId = (url) => url.split('/').pop();
const report = JSON.parse(runAudit());
// An audit that could not run (registry down, bad token...) prints an error object and exits non-zero: that is a failure, never an empty report.
if (report.error || typeof report.vulnerabilities !== 'object' || report.vulnerabilities === null || typeof report.metadata !== 'object') {
  console.error(`npm audit did not return a report: ${JSON.stringify(report.error ?? report).slice(0, 500)}`);
  process.exit(1);
}
const found = new Map();
for (const vulnerability of Object.values(report.vulnerabilities)) {
  for (const via of vulnerability.via) {
    if (typeof via === 'object' && via.url) found.set(advisoryId(via.url), { ...via, package: vulnerability.name, fixAvailable: vulnerability.fixAvailable });
  }
}

const blocked = [...found.values()].filter((a) => BLOCKING.has(a.severity) && !allowed.has(advisoryId(a.url)));
for (const [id, entry] of allowed) {
  if (!found.has(id)) console.log(`::warning::audit-allowlist entry ${id} (${entry.package}) is no longer reported: remove it from scripts/audit-allowlist.json`);
  else console.log(`allowlisted: ${id} (${entry.package}): ${entry.reason}`);
}
if (blocked.length) {
  console.error(`npm audit: ${blocked.length} high or critical advisor${blocked.length === 1 ? 'y' : 'ies'} not allowlisted:\n${blocked.map((a) => `- ${a.severity} ${a.package}: ${a.title} (${a.url})`).join('\n')}`);
  process.exit(1);
}
console.log('audit gate passed');
