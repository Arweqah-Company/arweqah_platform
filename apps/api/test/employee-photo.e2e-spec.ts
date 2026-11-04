import { CorePermission, type EmployeeDto, type PermissionGrant } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { useTestApp } from './setup/test-app';

const P = CorePermission;
const grant = (key: string, scope: PermissionGrant['scope']): PermissionGrant => ({ key, scope });
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');

describe('Employee profile photo (FR-91)', () => {
  const t = useTestApp();

  async function setup() {
    const org = await t.factories.org();
    const person = await t.factories.user({ unit: org.unitA });
    const colleague = await t.factories.user({ unit: org.unitA });
    const own = await t.factories.signIn(person);
    return { org, person, colleague, own };
  }

  it('lets a person set their own photo, read it back, and remove it', async () => {
    const { person, own } = await setup();
    const res = await own.put(`/api/employees/${person.employeeId}/photo`).attach('file', PNG, { filename: 'me.png', contentType: 'image/png' }).expect(200);
    expect(res.body.photoFileId).toBeTruthy();
    const record = (await own.get(`/api/employees/${person.employeeId}`).expect(200)).body as EmployeeDto;
    expect(record.photoFileId).toBe(res.body.photoFileId);
    const image = await own.get(`/api/employees/${person.employeeId}/photo`).expect(200);
    expect(image.headers['content-type']).toContain('image/png');
    await own.delete(`/api/employees/${person.employeeId}/photo`).expect(204);
    await own.get(`/api/employees/${person.employeeId}/photo`).expect(404);
  });

  it('accepts only a JPEG or PNG of at most 2 MB, judged by its content and not its name', async () => {
    const { person, own } = await setup();
    const url = `/api/employees/${person.employeeId}/photo`;
    await own.put(url).attach('file', PDF, { filename: 'looks-like.png', contentType: 'image/png' }).expect(422);
    await own.put(url).attach('file', Buffer.concat([PNG, Buffer.alloc(3 * 1024 * 1024)]), { filename: 'big.png', contentType: 'image/png' }).expect((r) => expect([413, 422]).toContain(r.status));
    await own.put(url).expect(400);
  });

  it("is changed for another person only with the key's reach: a colleague gets 404, a person with company reach succeeds", async () => {
    const { person, colleague, own } = await setup();
    await own.put(`/api/employees/${colleague.employeeId}/photo`).attach('file', PNG, { filename: 'x.png', contentType: 'image/png' }).expect(404);
    const hr = await t.factories.signIn(await t.factories.user({ grants: [grant(P.EmployeesPhotoUpdate, 'all')] }));
    await hr.put(`/api/employees/${person.employeeId}/photo`).attach('file', PNG, { filename: 'x.png', contentType: 'image/png' }).expect(200);
  });

  it("is read by the person's teammates (and who reaches the record), not by another unit nor without the team key (404, as for any record out of reach); a missing photo is a 404", async () => {
    const { org, person, colleague, own } = await setup();
    await own.put(`/api/employees/${person.employeeId}/photo`).attach('file', PNG, { filename: 'me.png', contentType: 'image/png' }).expect(200);
    const seeing = await t.factories.signIn(colleague);
    await seeing.get(`/api/employees/${person.employeeId}/photo`).expect(200);
    await seeing.get(`/api/employees/${colleague.employeeId}/photo`).expect(404);
    const otherUnit = await t.factories.signIn(await t.factories.user({ unit: org.unitB }));
    await otherUnit.get(`/api/employees/${person.employeeId}/photo`).expect(404);
    const stranger = await t.factories.signIn(await t.factories.user({ without: ['directory.'] }));
    await stranger.get(`/api/employees/${person.employeeId}/photo`).expect(404);
  });
});
