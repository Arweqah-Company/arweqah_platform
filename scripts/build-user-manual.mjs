// Builds the branded user manual (served at /docs) from docs/user-manual/<lang>/USER_MANUAL.md into apps/web/public/docs.
// Static HTML, no scripts (the site's CSP allows scripts from itself only). Usage: npm run docs:build
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'apps/web/public/docs');
const T = {
  ar: { dir: 'rtl', title: 'دليل المستخدم', brand: 'أروقة الريادة', toc: 'المحتويات', other: 'English', otherHref: '../en/', skip: 'انتقل إلى المحتوى', logoAlt: 'أروقة', foot: 'أروقة الريادة. جميع الحقوق محفوظة.' },
  en: { dir: 'ltr', title: 'User Manual', brand: 'Arweqah Alreyadah', toc: 'Contents', other: 'العربية', otherHref: '../ar/', skip: 'Skip to content', logoAlt: 'Arweqah', foot: 'Arweqah Alreyadah. All rights reserved.' },
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = (s) => esc(s)
  .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img class="shot" loading="lazy" alt="$1" src="$2">')
  .replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

function render(md) {
  const out = []; const toc = []; const lines = md.split('\n'); let n = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith('@@ ')) { toc.push([null, l.slice(3)]); out.push(`<p class="group">${inline(l.slice(3))}</p>`); }
    else if (l.startsWith('# ')) out.push(`<h1>${inline(l.slice(2))}</h1>`);
    else if (l.startsWith('#### ')) out.push(`<h4>${inline(l.slice(5))}</h4>`);
    else if (l.startsWith('### ')) out.push(`<h3>${inline(l.slice(4))}</h3>`);
    else if (l.startsWith('## ')) { n++; const id = `s${n}`; const text = `${n}. ${l.slice(3)}`; toc.push([id, text]); out.push(`<h2 id="${id}">${inline(text)}</h2>`); }
    else if (l.startsWith('|') && lines[i + 1]?.startsWith('|')) {
      const head = cells(l); i += 2; const rows = [];
      while (lines[i]?.startsWith('|')) rows.push(cells(lines[i++])); i--;
      out.push(`<div class="tbl"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
    } else if (/^(- |\d+\. )/.test(l)) {
      const tag = l.startsWith('- ') ? 'ul' : 'ol'; const items = [];
      while (i < lines.length && /^(- |\d+\. )/.test(lines[i])) items.push(lines[i++].replace(/^(- |\d+\. )/, '')); i--;
      out.push(`<${tag}>${items.map((x) => `<li>${inline(x)}</li>`).join('')}</${tag}>`);
    } else if (l.startsWith('> ')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('> ')) rows.push(lines[i++].slice(2)); i--;
      out.push(`<aside class="note">${rows.map((x) => `<p>${inline(x)}</p>`).join('')}</aside>`);
    } else if (l.trim() && l.trim() !== '---') out.push(`<p>${inline(l)}</p>`);
  }
  return { body: out.join('\n'), toc };
}

function page(lang, { body, toc }) {
  const t = T[lang];
  const nav = toc.map(([id, text]) => (id ? `<a href="#${id}">${esc(text)}</a>` : `<p class="label grp">${esc(text)}</p>`)).join('');
  return `<!doctype html>
<html lang="${lang}" dir="${t.dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t.title)} — ${esc(t.brand)}</title><meta name="color-scheme" content="light dark">
<link rel="icon" href="/brand/favicon-32.png"><link rel="stylesheet" href="../docs.css"></head>
<body><a class="skip" href="#main">${t.skip}</a>
<div class="layout"><aside class="side"><div class="side-in">
<img src="/brand/logo-color-on-dark-horizontal.png" alt="${t.logoAlt}"><details class="toc" open><summary>${t.toc}</summary><nav aria-label="${t.toc}">${nav}</nav></details>
<a class="lang" href="${t.otherHref}" hreflang="${lang === 'ar' ? 'en' : 'ar'}">${t.other}</a></div></aside>
<main id="main">${body}<footer>© ${new Date().getFullYear()} ${t.foot}</footer></main></div>
<script>if (matchMedia("(max-width: 860px)").matches) document.querySelector(".toc").open = false;</script></body></html>
`;
}

/**
 * The manual is written as one file per page (docs/user-manual/sections/NN-name.<lang>.md) and shown in the groups of the
 * system's own side menu (same names, same order). Pages an administrator hides from the menu are not in the manual.
 */
const SECTIONS = join(ROOT, 'docs/user-manual/sections');
const GROUPS = [
  { ar: 'البداية', en: 'Getting started', files: ['01-concepts', '02-sign-in', '03-home', '08-tour'] },
  { ar: 'حسابي', en: 'My account', files: ['04-profile', '05-notifications', '06-security', '07-my-access'] },
  { ar: 'الموارد البشرية', en: 'People', files: ['20-employees', '21-org', '22-job-titles', '23-companies'] },
  { ar: 'الملف المهني', en: 'Career file', files: ['60-my-career', '62-career-team', '61-career-certificates', '63-career-requests', '64-career-content', '65-performance-cycle', '66-performance-calibration', '67-performance-team'] },
  { ar: 'المهام', en: 'Tasks', files: ['30-tasks', '31-task-details-conversation', '32-task-tags', '33-task-policies'] },
  { ar: 'التذاكر', en: 'Tickets', files: ['34-tickets', '35-ticket-setup', '36-ticket-figures'] },
  { ar: 'إدارة النظام', en: 'System administration', files: ['40-roles', '41-permissions', '44-audit', '45-email-log', '46-settings'] },
];
const read = (name, lang) => readFileSync(join(SECTIONS, `${name}.${lang}.md`), 'utf8').trim();
const source = (lang) => [read('00-intro', lang), ...GROUPS.flatMap((g) => [`@@ ${g[lang]}`, ...g.files.map((f) => read(f, lang))])].join('\n\n');

for (const lang of ['ar', 'en']) {
  mkdirSync(join(OUT, lang), { recursive: true });
  writeFileSync(join(OUT, lang, 'index.html'), page(lang, render(source(lang))));
}
writeFileSync(join(OUT, 'index.html'), `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>دليل المستخدم · User Manual — Arweqah</title><link rel="icon" href="/brand/favicon-32.png"><link rel="stylesheet" href="docs.css"></head>
<body class="chooser"><main class="card" style="border:0"><img src="/brand/logo-color-vertical.png" alt="أروقة · Arweqah">
<h1 style="font-size:1.5rem">دليل المستخدم · User Manual</h1>
<a class="btn" href="ar/" lang="ar">العربية</a><a class="btn" href="en/" lang="en" dir="ltr">English</a></main></body></html>
`);
console.log('Built apps/web/public/docs');
