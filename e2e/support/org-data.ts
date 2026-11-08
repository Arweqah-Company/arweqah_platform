import { expect, type Page } from '@playwright/test';
import { adminModeOnViaApi } from './admin-mode';

const ORIGIN = { origin: 'http://localhost:4173' };

interface TreeNode { id: string; nameAr: string; code: string | null; levelKey: string; titles: { id: string }[] }

/** The structure the administrator sees in full (admin mode must be on). */
export async function fullTree(page: Page): Promise<TreeNode[]> {
  const tree = (await (await page.request.get('/api/org/tree?view=full')).json()) as { nodes: TreeNode[] };
  return tree.nodes;
}

export async function unitNamed(page: Page, nameAr: string): Promise<TreeNode> {
  const unit = (await fullTree(page)).find((n) => n.nameAr === nameAr);
  if (!unit) throw new Error(`no unit named ${nameAr}`);
  return unit;
}

/** The group company, which holds every unit and leads the shared ones. */
export async function groupCompanyId(page: Page, unitId: string): Promise<string> {
  return ((await (await page.request.get(`/api/org/nodes/${unitId}/leaders`)).json()) as { groupCompanyId: string }).groupCompanyId;
}

export interface MadeTitle { id: string; code: string | null; nameAr: string }

/** A job title with a grade and a track (so it has a code) in a unit, made through the API. */
export async function makeTitle(page: Page, unitId: string, nameAr: string, grade: number, track: string, reportsToTitleId?: string): Promise<MadeTitle> {
  const response = await page.request.post(`/api/org/nodes/${unitId}/job-titles`, { data: { jobTitles: [{ nameAr, nameEn: `Title ${nameAr}`, grade, track, ...(reportsToTitleId ? { reportsToTitleId } : {}) }] }, headers: ORIGIN });
  expect(response.status(), await response.text()).toBe(201);
  const [made] = (await response.json()) as MadeTitle[];
  return made as MadeTitle;
}

/** An employee of a company in a unit holding a title, made through the API; returns the name. */
export async function makeEmployee(page: Page, options: { companyId: string; unitId: string; titleId: string; name: string; tag: string }): Promise<string> {
  const response = await page.request.post('/api/employees', {
    data: { companyId: options.companyId, orgNodeId: options.unitId, jobTitleId: options.titleId, workEmail: `${options.tag}@arweqah.sa`, employeeNumber: options.tag.toUpperCase(), fullName: options.name, startDate: '2024-03-01' },
    headers: ORIGIN,
  });
  expect(response.status(), await response.text()).toBe(201);
  return options.name;
}

/** A short tag that differs between runs and between the two projects that run in the same database. */
export const uniqueTag = (project: string): string => `${project.slice(0, 1)}${Date.now().toString().slice(-7)}`;

const SAMPLE_UNIT = 'وحدة التسويق';
const sampled = new Set<string>();

/**
 * One title with one holder in a unit of the sample structure, so that the team view and the job-titles list have a first row (the welcome tour
 * points at them). A spec that needs it makes it itself, once per project, instead of relying on another file having run before it in the same
 * database: the suite is split over several runners in CI. Switches admin mode on (the structure is read in full).
 */
export async function ensureTeamSample(page: Page, project: string): Promise<void> {
  if (sampled.has(project)) return;
  await adminModeOnViaApi(page);
  const tag = uniqueTag(project);
  const unit = await unitNamed(page, SAMPLE_UNIT);
  const title = await makeTitle(page, unit.id, `مسمى الجولة ${tag}`, 7, 'P');
  await makeEmployee(page, { companyId: await groupCompanyId(page, unit.id), unitId: unit.id, titleId: title.id, name: `موظف الجولة ${tag}`, tag: `tour${tag}` });
  sampled.add(project);
}
