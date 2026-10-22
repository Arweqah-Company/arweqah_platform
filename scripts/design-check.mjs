#!/usr/bin/env node
// Mechanical checks of the Arweqah design system in apps/web/src (see .claude/skills/arweqah-design-system).
// Usage: node scripts/design-check.mjs   (exit code 1 when violations are found)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'apps/web/src');
const THEME = join(SRC, 'core/theme.css');

const BRAND = ['cream', 'white', 'fg', 'link', 'primary', 'success', 'warning', 'green', 'ink', 'orange', 'beige', 'neutral', 'petrol', 'yellow', 'danger', 'muted'];
const COLOR_UTILITY = /\b(?:bg|text|border|ring|outline|fill|stroke|from|via|to|divide|placeholder|accent|caret|decoration|shadow)-([a-z]+)(?:-\d{2,3})?(?:\/\d+)?\b/g;
const NON_COLOR_WORDS = new Set([
  'xs', 'sm', 'md', 'lg', 'xl', 'base', 'left', 'right', 'center', 'start', 'end', 'top', 'bottom', 'none', 'auto', 'clip', 'ellipsis',
  'wrap', 'nowrap', 'balance', 'pretty', 'justify', 'cover', 'contain', 'fixed', 'scroll', 'inherit', 'transparent', 'current', 'solid', 'dashed',
  'dotted', 'double', 'hidden', 'collapse', 'separate', 'spacing', 'opacity', 'offset', 'inset', 'size', 'width', 'color', 'hover', 'focus', 'visible',
  'bold', 'medium', 'normal', 'semibold', 'light', 'thin', 'black', 'extrabold', 'italic', 'underline', 'overline', 'through', 'uppercase',
  'lowercase', 'capitalize', 'clip', 'repeat', 'no', 'x', 'y', 'blend', 'gradient', 'origin', 'position', 'sm:', 'panel', 'control', 'full', 'screen',
  'min', 'max', 'fit', 'px', 'ms', 'me', 'sr', 'only', 'xl', 'tight', 'snug', 'relaxed', 'loose', 'wide', 'wider', 'widest', 'tighter', 'numeric', 'sans',
  'heading', 'latin', 'mono', 'serif', 'pulse', 'spin', 'ping', 'bounce', 'layout', 'indent', 'align', 'decoration', 'underline',
]);
const PHYSICAL = /(?:^|[\s"'`:])(?:-?m[lr]-|-?p[lr]-|(?:left|right)-|text-(?:left|right)|border-[lr]-|rounded-[lr]-|float-(?:left|right))/;

const problems = [];
const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (['node_modules', 'dist', 'assets'].includes(name)) continue;
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
};

const files = walk(SRC).filter((f) => /\.(tsx?|css)$/.test(f) && !/\.test\.tsx?$/.test(f));
for (const file of files) {
  const rel = relative(ROOT, file);
  const isTheme = file === THEME;
  readFileSync(file, 'utf8').split('\n').forEach((raw, i) => {
    const line = raw.replace(/\/\/.*$/, '');
    const at = `${rel}:${i + 1}`;
    if (!isTheme && /#[0-9a-fA-F]{3,8}\b/.test(line) && !/&#|href=|url\(#/.test(line)) problems.push(`${at}: hex color; use a brand token class`);
    if (!isTheme && /\b(?:rgb|hsl)a?\(/.test(line)) problems.push(`${at}: rgb()/hsl() color; use a brand token class`);
    if (/\bstyle=\{\{/.test(line)) problems.push(`${at}: inline style; use token classes`);
    if (PHYSICAL.test(line) && /class(Name)?=|cn\(|'[^']*'|"[^"]*"/.test(line)) problems.push(`${at}: physical direction class (use logical ms-/me-/ps-/pe-/start-/end-)`);
    if (/font-family|fontFamily/.test(line) && !isTheme) problems.push(`${at}: font-family override; Tajawal only, via theme tokens`);
    if (/<img[^>]*src=["']\/brand/.test(line)) problems.push(`${at}: raw logo <img>; use the BrandLogo component`);
    if (!isTheme && /\.(tsx?)$/.test(file)) {
      for (const m of line.matchAll(COLOR_UTILITY)) {
        const word = m[1];
        if (NON_COLOR_WORDS.has(word) || BRAND.includes(word) || /^(on|data|aria|group|peer|rtl|ltr|sr|md|lg|xl)$/.test(word)) continue;
        if (/^[a-z]+$/.test(word) && m[0].match(/-\d{2,3}/)) problems.push(`${at}: "${m[0]}" is not a brand color`);
        else if (['white', 'gray', 'grey', 'slate', 'zinc', 'neutral', 'stone', 'red', 'blue', 'sky', 'indigo', 'violet', 'purple', 'pink', 'rose', 'teal', 'cyan', 'emerald', 'lime', 'amber', 'fuchsia', 'navy', 'gold', 'surface', 'line'].includes(word))
          problems.push(`${at}: "${m[0]}" is not a brand color`);
      }
    }
  });
}

const theme = readFileSync(THEME, 'utf8');
if (!/--color-\*:\s*initial/.test(theme)) problems.push('theme.css: the Tailwind default palette must be reset (--color-*: initial)');
for (const token of ['cream', 'green-400', 'ink', 'orange-500', 'beige-300', 'petrol-800', 'yellow-300'])
  if (!theme.includes(`--color-${token}:`)) problems.push(`theme.css: missing brand token --color-${token}`);
if (/fontsource|Cairo|Inter/.test(readFileSync(join(SRC, 'main.tsx'), 'utf8'))) problems.push('main.tsx: only the brand typeface (Tajawal) may be loaded');

if (problems.length) {
  console.error(`design check found ${problems.length} problem(s):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('design check passed');
