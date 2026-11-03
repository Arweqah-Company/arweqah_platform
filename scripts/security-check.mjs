#!/usr/bin/env node
// Static security checks for the Arweqah platform (see .claude/skills/security-check).
// Usage: node scripts/security-check.mjs [--audit]   (--audit also runs `npm audit --omit=dev --audit-level=high`)
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const problems = [];

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    if (['node_modules', 'dist', 'coverage', '.git', 'storage', 'storage-test', 'test-results', 'playwright-report'].includes(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
};

// Text of plain string literals is not code: `logger.warn('password not set')` is fine, `logger.warn(password)` is not.
const stripPlainStrings = (line) => line.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`[^`$]*`/g, '""');
const SKIP_SQL = /database\/(migrations|seeds\/reset-test-db)/;
const isTest = (f) => /\.(spec|test|e2e-spec)\.tsx?$|[/\\]test[/\\]|[/\\]e2e[/\\]/.test(f);
const rules = [
  { name: 'dangerouslySetInnerHTML (XSS)', test: /dangerouslySetInnerHTML/, scope: /apps\/web\/src/ },
  { name: 'eval / new Function', test: /\beval\s*\(|new Function\s*\(/, scope: /apps\/(api|web)\/src/ },
  { name: 'token or session stored in web storage', test: /(local|session)Storage\.setItem\([^)]*(token|session|secret|password|jwt)/i, scope: /apps\/web\/src/ },
  { name: 'SQL built by string interpolation', test: /\.(query|createQueryBuilder)\(\s*`[^`]*\$\{/, scope: /apps\/api\/src/ },
  { name: 'wildcard CORS origin', test: /origin:\s*['"]\*['"]|enableCors\(\s*\)/, scope: /apps\/api\/src/ },
  { name: 'TLS verification disabled', test: /rejectUnauthorized:\s*false|NODE_TLS_REJECT_UNAUTHORIZED/, scope: /apps\/(api|web)\/src/ },
  { name: 'sensitive field logged', test: /(logger|console)\.(log|debug|info|warn|error)\([^)]*(idNumber|iban|salary|password|secret|totp|backupCode)/i, scope: /apps\/(api|web)\/src/ },
  { name: 'password sign-in re-enabled', test: /emailAndPassword:\s*\{\s*enabled:\s*true/, scope: /better-auth\.factory/ },
  { name: 'self sign-up enabled', test: /disableSignUp:\s*false/, scope: /apps\/api\/src/ },
  { name: 'hard-coded secret or key', test: /(AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC )?PRIVATE KEY-----|xox[bp]-[0-9A-Za-z-]{10,})/, scope: /.*/ },
  { name: 'open redirect from user input', test: /(window\.location|location\.href)\s*=\s*(?!['"`/])[a-zA-Z_.]*(from|redirect|next|returnTo)/i, scope: /apps\/web\/src/ },
  { name: 'unsafe target=_blank without rel', test: /target=["']_blank["'](?![^>]*rel=)/, scope: /apps\/web\/src/ },
];

for (const file of walk(ROOT).filter((f) => /\.(tsx?|mjs|json|ya?ml|env\.example)$/.test(f))) {
  const rel = relative(ROOT, file);
  if (rel === 'package-lock.json' || rel.startsWith('scripts/security-check') || rel.startsWith('docs/')) continue;
  const text = readFileSync(file, 'utf8');
  for (const rule of rules) {
    if (!rule.scope.test(rel) || (isTest(rel) && rule.name !== 'hard-coded secret or key')) continue;
    if (rule.name.startsWith('SQL') && SKIP_SQL.test(rel)) continue;
    text.split('\n').forEach((line, i) => {
      const subject = rule.name === 'sensitive field logged' ? stripPlainStrings(line) : line;
      if (rule.test.test(subject)) problems.push(`${rel}:${i + 1}: ${rule.name}`);
    });
  }
}

// Every controller route must be guarded: @RequirePermission or an explicit @Public / @AllowBeforeMfa / @OwnData decision.
for (const file of walk(join(ROOT, 'apps/api/src')).filter((f) => f.endsWith('.controller.ts'))) {
  const text = readFileSync(file, 'utf8');
  if (/security:\s*self-scoped/.test(text)) continue;
  const routes = text.match(/@(Get|Post|Put|Patch|Delete)\(/g)?.length ?? 0;
  const guards = text.match(/@(RequirePermission|AllowBeforeMfa|AllowAnonymous|Public|OptionalAuth|OwnData)\(/g)?.length ?? 0;
  if (routes > guards) problems.push(`${relative(ROOT, file)}: ${routes} route(s) but ${guards} guard decorator(s); every route needs @RequirePermission or an explicit public/allow decorator`);
}

if (process.argv.includes('--audit')) {
  try {
    execSync('npm audit --omit=dev --audit-level=high', { cwd: ROOT, stdio: 'pipe' });
  } catch (error) {
    problems.push(`npm audit (production dependencies) reported high or critical advisories:\n${String(error.stdout ?? error.message).slice(0, 1500)}`);
  }
}

if (problems.length) {
  console.error(`security check found ${problems.length} problem(s):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('security check passed');
