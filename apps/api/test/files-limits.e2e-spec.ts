import { CorePermission } from '@arweqah-platform/shared';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { useTestApp } from './setup/test-app';

const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');
const MB = 1024 * 1024;

/** A PowerPoint file as the format defines it: a zip with the content types and one slide. */
async function pptx(padding = 0): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>');
  zip.file('ppt/presentation.xml', '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>');
  zip.file('ppt/slides/slide1.xml', '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>عرض تجريبي</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>');
  if (padding) zip.file('ppt/media/padding.bin', Buffer.alloc(padding, 7), { compression: 'STORE' });
  return zip.generateAsync({ type: 'nodebuffer' });
}

describe('The size of an attachment and PowerPoint files (FR-191)', () => {
  const t = useTestApp();
  const SETTINGS = [{ key: CorePermission.AdminModeUse, scope: 'all' as const }, { key: CorePermission.SecuritySettingsView, scope: 'all' as const }, { key: CorePermission.SecuritySettingsEdit, scope: 'all' as const }];
  const setMax = async (mb: number) => {
    const admin = await t.factories.signInAdminMode(await t.factories.user({ grants: SETTINGS }));
    const current = (await admin.get('/api/security-settings').expect(200)).body;
    await admin.put('/api/security-settings').send({ ...current, maxUploadMb: mb }).expect(200);
  };

  it('keeps 10 MB until the administrator changes it, tells the screens through /me, and refuses a bigger file in words', async () => {
    const user = await t.factories.signIn(await t.factories.user());
    expect((await user.get('/api/me').expect(200)).body.maxUploadMb).toBe(10);
    const big = await pptx(11 * MB);
    expect((await user.post('/api/files').attach('file', big, 'big.pptx').expect(422)).body.code).toBe('FILE_TOO_LARGE');
    await user.post('/api/files').attach('file', PNG, 'small.png').expect(201);
  });

  it('lets the administrator raise it, and the new size applies at once to every upload: 11 MB passes at 50, 2 MB is refused at 1', async () => {
    await setMax(50);
    const user = await t.factories.signIn(await t.factories.user());
    expect((await user.get('/api/me').expect(200)).body.maxUploadMb).toBe(50);
    const stored = (await user.post('/api/files').attach('file', await pptx(11 * MB), 'big.pptx').expect(201)).body;
    expect(stored.size).toBeGreaterThan(11 * MB);
    await setMax(1);
    expect((await user.post('/api/files').attach('file', await pptx(2 * MB), 'two.pptx').expect(422)).body.code).toBe('FILE_TOO_LARGE');
  });

  it('accepts a PowerPoint file, stores it as such, and serves it back to its owner for the preview and the download, and to nobody else', async () => {
    const owner = await t.factories.signIn(await t.factories.user());
    const stored = (await owner.post('/api/files').attach('file', await pptx(), 'عرض.pptx').expect(201)).body;
    expect(stored.contentType).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
    const preview = await owner.get(`/api/files/${stored.id}/preview`).buffer(true).parse((res, cb) => { const chunks: Buffer[] = []; res.on('data', (c: Buffer) => chunks.push(c)); res.on('end', () => cb(null, Buffer.concat(chunks))); }).expect(200);
    expect(preview.headers['content-type']).toContain('presentationml.presentation');
    expect(preview.headers['content-disposition']).toMatch(/^inline/);
    await owner.get(`/api/files/${stored.id}/content`).expect(200);
    const stranger = await t.factories.signIn(await t.factories.user());
    await stranger.get(`/api/files/${stored.id}/preview`).expect(404);
  });

  it('still refuses a file whose content is not one of the allowed types', async () => {
    const user = await t.factories.signIn(await t.factories.user());
    expect((await user.post('/api/files').attach('file', Buffer.from('MZ not a document'), 'tool.exe').expect(422)).body.code).toBe('FILE_TYPE_NOT_ALLOWED');
  });

  it('refuses a size outside 1 to 100 MB (400) and keeps the setting for admins only (403)', async () => {
    const admin = await t.factories.signInAdminMode(await t.factories.user({ grants: SETTINGS }));
    const current = (await admin.get('/api/security-settings').expect(200)).body;
    await admin.put('/api/security-settings').send({ ...current, maxUploadMb: 0 }).expect(400);
    await admin.put('/api/security-settings').send({ ...current, maxUploadMb: 101 }).expect(400);
    const employee = await t.factories.signIn(await t.factories.user());
    await employee.put('/api/security-settings').send({ ...current, maxUploadMb: 20 }).expect(403);
  });
});
