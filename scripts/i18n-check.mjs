#!/usr/bin/env node
// Checks the web app's Arabic/English translation files: key parity, empty values,
// placeholder parity, wrong-script values and hard-coded Arabic in components.
// Usage: node scripts/i18n-check.mjs   (exit code 1 when problems are found)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const WEB_SRC = join(ROOT, 'apps/web/src');
const ARABIC = /[؀-ۿ]/;
const LATIN = /[A-Za-z]/;
const problems = [];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (name === 'node_modules' || name === 'dist') continue;
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

function flatten(obj, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') flatten(value, path, out);
    else out[path] = String(value);
  }
  return out;
}

const placeholders = (text) => [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort().join(',');
// Plural suffixes (_one, _other, _zero, _two, _few, _many) differ per language; compare base keys.
const baseKey = (key) => key.replace(/_(zero|one|two|few|many|other)$/, '');

function checkPair(arPath, enPath) {
  const label = relative(ROOT, arPath).replace('/ar.json', '');
  const ar = flatten(JSON.parse(readFileSync(arPath, 'utf8')));
  const en = flatten(JSON.parse(readFileSync(enPath, 'utf8')));
  const arBase = new Set(Object.keys(ar).map(baseKey));
  const enBase = new Set(Object.keys(en).map(baseKey));
  for (const key of arBase) if (!enBase.has(key)) problems.push(`${label}: "${key}" missing in en`);
  for (const key of enBase) if (!arBase.has(key)) problems.push(`${label}: "${key}" missing in ar`);
  for (const [key, value] of Object.entries(ar)) {
    if (!value.trim()) problems.push(`${label}: "${key}" is empty in ar`);
    else if (!ARABIC.test(value) && LATIN.test(value) && !/^[\w\s.{}/@-]+$/.test(value)) problems.push(`${label}: ar "${key}" has no Arabic text: ${value}`);
    if (en[key] !== undefined && placeholders(value) !== placeholders(en[key])) problems.push(`${label}: "${key}" placeholders differ between ar and en`);
  }
  for (const [key, value] of Object.entries(en)) {
    if (!value.trim()) problems.push(`${label}: "${key}" is empty in en`);
    else if (ARABIC.test(value) && !key.startsWith('language.')) problems.push(`${label}: en "${key}" contains Arabic: ${value}`);
  }
}

const files = walk(WEB_SRC);
for (const arPath of files.filter((f) => f.endsWith('/ar.json'))) {
  const enPath = arPath.replace(/ar\.json$/, 'en.json');
  try {
    checkPair(arPath, enPath);
  } catch (error) {
    problems.push(`${relative(ROOT, arPath)}: ${error.message}`);
  }
}

// Hard-coded Arabic belongs in the JSON files, not in components (tests and comments excluded).
for (const file of files.filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))) {
  readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
    const code = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
    if (ARABIC.test(code) && !/^\s*(\*|\/\*)/.test(line)) problems.push(`${relative(ROOT, file)}:${index + 1}: hard-coded Arabic text`);
  });
}

// Every static key a component passes to t('...') (feature namespace) or tc('...') (common) must exist in the JSON.
function lookup(json, key) {
  const direct = key.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), json);
  if (direct !== undefined) return true;
  const parent = key.split('.').slice(0, -1).reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), json);
  const last = key.split('.').at(-1);
  return !!parent && typeof parent === 'object' && [`${last}_one`, `${last}_other`].some((k) => k in parent);
}

const common = JSON.parse(readFileSync(join(WEB_SRC, 'core/i18n/locales/ar.json'), 'utf8'));
for (const file of files.filter((f) => /features\/[^/]+\/.*\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))) {
  const feature = file.match(/features\/([^/]+)\//)?.[1];
  const jsonPath = join(WEB_SRC, 'features', feature, 'i18n/ar.json');
  const text = readFileSync(file, 'utf8');
  const ns = text.match(/const \{[^}]*\bt\b[^}]*\} = useTranslation\('([^']+)'\)/)?.[1];
  const featureJson = ns === feature ? JSON.parse(readFileSync(jsonPath, 'utf8')) : null;
  const check = (name, json, label) => {
    for (const match of text.matchAll(new RegExp(`\\b${name}\\('([A-Za-z0-9_.]+)'`, 'g'))) {
      if (json && !lookup(json, match[1])) problems.push(`${relative(ROOT, file)}: ${label} key "${match[1]}" is not in the translation file`);
    }
  };
  check('t', featureJson, ns ?? feature);
  check('tc', common, 'common');
}

if (problems.length) {
  console.error(`i18n check found ${problems.length} problem(s):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('i18n check passed');
