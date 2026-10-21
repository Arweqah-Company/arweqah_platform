// Architecture check: the folder rules of the module-architecture skill and CLAUDE.md that ESLint cannot see.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const API = 'apps/api/src';
const WEB = 'apps/web/src';
const problems = [];
const dirs = (path) => readdirSync(path).filter((n) => statSync(join(path, n)).isDirectory());
const files = (path) => readdirSync(path).filter((n) => statSync(join(path, n)).isFile());

const KINDS = {
  domain: ['entities', 'types', 'errors', 'contracts', 'rules', 'permissions'],
  application: ['services', 'policies', 'transformers', 'messages'],
  infrastructure: ['repositories', 'adapters', 'jobs'],
  presentation: ['controllers', 'dtos'],
};

// API modules: four layers, each split by kind of file, no loose code at a layer's root, a <feature>.module.ts.
for (const feature of dirs(join(API, 'modules'))) {
  const root = join(API, 'modules', feature);
  if (!existsSync(join(root, `${feature}.module.ts`))) problems.push(`${root}: missing ${feature}.module.ts`);
  for (const [layer, kinds] of Object.entries(KINDS)) {
    const layerDir = join(root, layer);
    if (!existsSync(layerDir)) { problems.push(`${root}: missing ${layer}/`); continue; }
    for (const file of files(layerDir)) problems.push(`${layerDir}/${file}: put it in a kind folder (${kinds.join(', ')})`);
    for (const dir of dirs(layerDir)) if (!kinds.includes(dir)) problems.push(`${layerDir}/${dir}: unknown kind folder (allowed: ${kinds.join(', ')})`);
  }
}

// Every file that defines entities is imported by database/entities.ts, and each class in it is listed there or in an exported array.
const registry = readFileSync(join(API, 'database/entities.ts'), 'utf8');
const walk = (path) => readdirSync(path).flatMap((n) => (statSync(join(path, n)).isDirectory() ? walk(join(path, n)) : [join(path, n)]));
for (const file of walk(API).filter((f) => /\.entit(y|ies)\.ts$/.test(f))) {
  const source = readFileSync(file, 'utf8');
  if (!source.includes('@Entity(')) continue; // abstract bases are not entities
  const stem = file.split('/').pop().replace(/\.ts$/, '');
  if (!registry.includes(`/${stem}'`)) problems.push(`${file}: not imported by database/entities.ts`);
  const grouped = /export const [A-Z_]+_ENTITIES\b/.test(source);
  for (const [, name] of source.matchAll(/@Entity\([^)]*\)\s*export class (\w+)/g)) {
    if (!grouped && !new RegExp(`\\b${name}\\b`).test(registry)) problems.push(`${file}: entity ${name} is not listed in database/entities.ts`);
    if (grouped && !new RegExp(`\\b${name}\\b`).test(source.slice(source.indexOf('_ENTITIES')))) problems.push(`${file}: entity ${name} is missing from its exported entities array`);
  }
}

// Web features: index.ts, both languages, and registration in app/features.ts.
const registered = readFileSync(join(WEB, 'app/features.ts'), 'utf8');
for (const feature of dirs(join(WEB, 'features'))) {
  const root = join(WEB, 'features', feature);
  if (!existsSync(join(root, 'index.ts'))) problems.push(`${root}: missing index.ts exporting a FeatureModule`);
  for (const lang of ['ar', 'en']) if (!existsSync(join(root, 'i18n', `${lang}.json`))) problems.push(`${root}: missing i18n/${lang}.json`);
  if (!registered.includes(`@/features/${feature}'`)) problems.push(`${root}: not registered in app/features.ts`);
}

// Shared code lives in shared/: features never import another feature's internals.
for (const file of walk(join(WEB, 'features')).filter((f) => /\.tsx?$/.test(f))) {
  const own = file.split('/')[file.split('/').indexOf('features') + 1];
  for (const [, other, rest] of readFileSync(file, 'utf8').matchAll(/from '@\/features\/([\w-]+)(\/[^']*)?'/g)) {
    if (other !== own && rest) problems.push(`${file}: imports ${other}${rest}; use @/features/${other} (its index.ts)`);
  }
}

if (problems.length) {
  console.error(`architecture check found ${problems.length} problem(s):\n${problems.map((p) => `- ${p}`).join('\n')}`);
  process.exit(1);
}
console.log('architecture check passed');
