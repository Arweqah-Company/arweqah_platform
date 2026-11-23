// Builds the user manual from docs/user-manual/sections into apps/web/src/features/docs/content/manual.<lang>.json.
// The manual is a page INSIDE the signed-in app (/docs): the page shows each person only the sections of the pages
// they may open (permission, page visibility). Images stay public static files in apps/web/public/docs/images.
// Usage: npm run docs:build
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'apps/web/src/features/docs/content');
// The same manual as plain text for the platform assistant (it answers «how do I…» from it): inside the API, so it ships with it.
const ASSISTANT_OUT = join(ROOT, 'apps/api/src/core/agent/assets');

/**
 * Permission keys (`employees.view`) mean nothing to a reader: the manual names a permission by the label the permissions page
 * shows (its Arabic / English name from the module's `*.permissions.ts`). Keys without a label stay as they are.
 */
const KEYS_SRC = readFileSync(join(ROOT, 'packages/shared/src/permissions/keys.ts'), 'utf8');
const keyOf = (name) => KEYS_SRC.match(new RegExp(`\\b${name}: '([a-z_.]+)'`))?.[1];
const STR = String.raw`('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")`;
const unescape = (v) => v.slice(1, -1).replace(/\\(.)/g, '$1');
function loadLabels() {
  const labels = new Map();
  const files = readdirSync(join(ROOT, 'apps/api/src'), { recursive: true }).filter((f) => f.endsWith('.permissions.ts'));
  const forms = [new RegExp(`\\w+\\(CorePermission\\.(\\w+),\\s*${STR},\\s*${STR}`, 'g'), new RegExp(`key: CorePermission\\.(\\w+),[^\\n]*?labelAr: ${STR}, labelEn: ${STR}`, 'g')];
  for (const f of files) for (const re of forms) for (const m of readFileSync(join(ROOT, 'apps/api/src', f), 'utf8').matchAll(re)) {
    const key = keyOf(m[1]);
    if (key) labels.set(key, { ar: unescape(m[2]), en: unescape(m[3]) });
  }
  return labels;
}
const LABELS = loadLabels();
const unresolved = new Set();
/** `key` (its label) -> the label alone; a bare `key` -> the label. The permission node keeps the key for the tooltip. */
function nameKeys(md, lang) {
  let out = ''; let at = 0;
  for (const m of md.matchAll(/`([a-z][a-z_]*\.[a-z_.]+)`/g)) {
    const label = LABELS.get(m[1])?.[lang];
    if (!label) { unresolved.add(m[1]); continue; }
    out += `${md.slice(at, m.index)}@@perm:${m[1]}@@`;
    at = m.index + m[0].length;
    const echo = md.slice(at, at + label.length + 3);
    if (echo.toLowerCase() === ` (${label})`.toLowerCase()) at += echo.length; // the label written again after the key
  }
  return out + md.slice(at);
}

/** Inline nodes: plain strings, {code}, {bold}, {img: {alt, src}}. The page draws them with React; no HTML is ever stored or injected. */
function inline(text) {
  const nodes = []; let last = 0;
  for (const m of text.matchAll(/!\[([^\]]*)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|@@perm:([a-z_.]+)@@/g)) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) nodes.push({ img: { alt: m[1], src: m[2].replace(/^\.\.\/images\//, '/docs/images/') } });
    else if (m[3] !== undefined) nodes.push({ code: m[3] });
    else if (m[5] !== undefined) nodes.push({ perm: { key: m[5], label: PERM_LANG[m[5]] } });
    else nodes.push({ bold: m[4] });
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const LIST = /^(- |\d+\. )/;
let PERM_LANG = {};

/** Markdown subset -> blocks: {h: 2|3|4, i}, {p: i}, {ul|ol: [i]}, {table: {head: [i], rows: [[i]]}}, {note: [i]}. */
function blocks(md) {
  const out = []; const lines = md.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const heading = l.match(/^(#{1,4}) (.+)$/);
    if (heading) { if (heading[1].length > 1) out.push({ h: heading[1].length, i: inline(heading[2]) }); }
    else if (l.startsWith('|') && lines[i + 1]?.startsWith('|')) {
      const head = cells(l).map(inline); i += 2; const rows = [];
      while (lines[i]?.startsWith('|')) rows.push(cells(lines[i++]).map(inline)); i--;
      out.push({ table: { head, rows } });
    } else if (LIST.test(l)) {
      const kind = l.startsWith('- ') ? 'ul' : 'ol'; const items = [];
      while (i < lines.length && LIST.test(lines[i])) items.push(inline(lines[i++].replace(LIST, ''))); i--;
      out.push({ [kind]: items });
    } else if (l.startsWith('> ')) {
      const ps = [];
      while (i < lines.length && lines[i].startsWith('> ')) ps.push(inline(lines[i++].slice(2))); i--;
      out.push({ note: ps });
    } else if (l.trim() && l.trim() !== '---') out.push({ p: inline(l) });
  }
  return out;
}

/**
 * The manual is written as one file per page (docs/user-manual/sections/NN-name.<lang>.md) and shown in the groups of the
 * system's own side menu (same names, same order). Pages an administrator hides from the menu are not in the manual.
 * `access`: who sees the section: any of `permissions` (CorePermission names, resolved from keys.ts) and not hidden by `page`
 * (the page-visibility key). No access = every signed-in person. A test checks it against the navigation of the app.
 */
const SECTIONS = join(ROOT, 'docs/user-manual/sections');
const key = (name) => keyOf(name) ?? (() => { throw new Error(`unknown permission ${name}`); })();
const A = (page, ...names) => ({ page, permissions: names.map(key) });
const ACCESS = {
  '04-profile': A(null, 'ProfileView'), '05-notifications': A(null, 'NotificationsView'), '06-security': A(null, 'SecurityView'), '09-assistant': A(null, 'AgentView'), '07-my-access': A(null, 'MyAccessView'),
  '20-employees': A('employees', 'EmployeesView'), '21-org': A('org', 'OrgView'), '22-job-titles': A('job-titles', 'JobTitlesView'), '23-companies': A('companies', 'CompaniesView'),
  '60-my-career': A('career-profile', 'CareerProfileView'), '62-career-team': A('career-team', 'CareerTeamView'), '61-career-certificates': A('career-certificates', 'CareerCertificatesReview'),
  '63-career-requests': A('career-requests', 'CareerRequestsView'), '64-career-content': A('career-content', 'CareerContentView'), '65-performance-cycle': A('performance-cycle', 'PerformanceCycleView'),
  '66-performance-calibration': A('performance-calibration', 'PerformanceCalibrationView'), '67-performance-team': A('performance-team', 'PerformanceTeamView'),
  '30-tasks': A('tasks', 'TasksView'), '31-task-details-conversation': A('tasks', 'TasksView'), '32-task-tags': A('task-tags', 'TasksTagsView'), '33-task-policies': A('task-policies', 'TasksPoliciesView'),
  '34-tickets': A('tickets', 'TicketsView'), '35-ticket-setup': A('ticket-setup', 'TicketsSetupView'), '36-ticket-figures': A('ticket-figures', 'TicketsFiguresView'),
  '70-notices-my': A('notices', 'NoticesView'), '71-notices-manage': A('notices-manage', 'NoticesManageView'), '72-notices-approvals': A('notices-approvals', 'NoticesApproveView'), '73-notices-channels': A('notices-channels', 'NoticesChannelsView'),
  '40-roles': A('roles', 'RolesView'), '41-permissions': A('permissions', 'PermissionsView'), '44-audit': A('audit', 'AuditView'), '45-email-log': A('email-log', 'EmailLogView'),
  '46-settings': A(null, 'IntegrationsTranslationView', 'IntegrationsEmailView', 'IntegrationsCaptchaView', 'IntegrationsAiView', 'TemplatesEmailView', 'TemplatesNotificationView', 'TourSettingsView', 'SecuritySettingsView'),
};
// Pages of the administration menus work only while platform admin mode is on: the section says so.
const ADMIN_MODE = new Set(['23-companies', '33-task-policies', '35-ticket-setup', '36-ticket-figures', '40-roles', '41-permissions', '44-audit', '45-email-log', '46-settings']);
const GROUPS = [
  { ar: 'البداية', en: 'Getting started', files: ['01-concepts', '02-sign-in', '03-home', '08-tour', '09-assistant'] },
  { ar: 'حسابي', en: 'My account', files: ['04-profile', '05-notifications', '06-security', '07-my-access'] },
  { ar: 'الموارد البشرية', en: 'People', files: ['20-employees', '21-org', '22-job-titles', '23-companies'] },
  { ar: 'الملف المهني', en: 'Career file', files: ['60-my-career', '62-career-team', '61-career-certificates', '63-career-requests', '64-career-content', '65-performance-cycle', '66-performance-calibration', '67-performance-team'] },
  { ar: 'المهام', en: 'Tasks', files: ['30-tasks', '31-task-details-conversation', '32-task-tags', '33-task-policies'] },
  { ar: 'التذاكر', en: 'Tickets', files: ['34-tickets', '35-ticket-setup', '36-ticket-figures'] },
  { ar: 'التعاميم والسياسات', en: 'Notices and policies', files: ['70-notices-my', '71-notices-manage', '72-notices-approvals', '73-notices-channels'] },
  { ar: 'إدارة النظام', en: 'System administration', files: ['40-roles', '41-permissions', '44-audit', '45-email-log', '46-settings'] },
];
const read = (name, lang) => nameKeys(readFileSync(join(SECTIONS, `${name}.${lang}.md`), 'utf8').trim(), lang);
const title = (md) => md.match(/^## (.+)$/m)[1];

/** A block of the manual as plain lines: no images, tables as «cell | cell» rows, lists as numbered or dashed lines. */
const flat = (nodes) => [nodes].flat().map((n) => (typeof n === 'string' ? n : n.bold ? flat(n.bold) : n.perm ? n.perm.label : n.code ? n.code : '')).join('');
const plain = (b) => {
  if (b.p) return flat(b.p);
  if (b.h) return `\n${flat(b.i)}`;
  if (b.note) return b.note.map(flat).join('\n');
  if (b.ul) return b.ul.map((item) => `- ${flat(item)}`).join('\n');
  if (b.ol) return b.ol.map((item, i) => `${i + 1}. ${flat(item)}`).join('\n');
  if (b.table) return [b.table.head, ...b.table.rows].map((row) => row.map(flat).join(' | ')).join('\n');
  return '';
};

mkdirSync(OUT, { recursive: true });
mkdirSync(ASSISTANT_OUT, { recursive: true });
for (const lang of ['ar', 'en']) {
  PERM_LANG = Object.fromEntries([...LABELS].map(([k, v]) => [k, v[lang]]));
  const sections = GROUPS.flatMap((g, group) => g.files.map((file) => {
    const md = read(file, lang);
    const access = ACCESS[file] ?? { page: null, permissions: [] };
    return { id: file.replace(/^\d+-/, ''), group, title: title(md), permissions: access.permissions, page: access.page, adminMode: ADMIN_MODE.has(file), blocks: blocks(md).filter((b) => b.h !== 2) };
  }));
  const intro = read('00-intro', lang);
  const manual = { title: intro.match(/^# (.+)$/m)[1], intro: blocks(intro), groups: GROUPS.map((g) => g[lang]), sections };
  writeFileSync(join(OUT, `manual.${lang}.json`), `${JSON.stringify(manual)}\n`);
  const text = sections.map(({ id, title, permissions, page, adminMode, blocks }) => ({ id, title, permissions, page, adminMode, text: blocks.map(plain).filter(Boolean).join('\n').replace(/\n{3,}/g, '\n\n').trim() }));
  writeFileSync(join(ASSISTANT_OUT, `manual-text.${lang}.json`), `${JSON.stringify(text)}\n`);
}
if (unresolved.size) console.warn(`Permission keys without a label (left as code): ${[...unresolved].sort().join(', ')}`);
console.log(`Built ${OUT}`);
