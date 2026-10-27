import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { useTestApp } from './setup/test-app';

describe('Arabic to English while typing (FR-58)', () => {
  const t = useTestApp();

  it('translates Arabic text for any signed-in person', async () => {
    const agent = await t.factories.signIn(await t.factories.user());
    const res = await agent.post('/api/translate').send({ text: '  إدارة الخدمات المشتركة ' }).expect(200);
    expect(res.body).toEqual({ text: 'EN: إدارة الخدمات المشتركة' });
  });

  it('returns text without Arabic letters as it is, without calling the service', async () => {
    const agent = await t.factories.signIn(await t.factories.user());
    const res = await agent.post('/api/translate').send({ text: 'IT 2024' }).expect(200);
    expect(res.body).toEqual({ text: 'IT 2024' });
    expect(t.translator.calls).toHaveLength(0);
  });

  it('refuses an empty text, an overlong text and unknown fields (400)', async () => {
    const agent = await t.factories.signIn(await t.factories.user());
    await agent.post('/api/translate').send({ text: '   ' }).expect(400);
    await agent.post('/api/translate').send({ text: 'ا'.repeat(1001) }).expect(400);
    await agent.post('/api/translate').send({ text: 'مرحبا', to: 'fr' }).expect(400);
  });

  it('is closed to people who are not signed in (401)', async () => {
    await request(t.app.getHttpServer()).post('/api/translate').send({ text: 'مرحبا' }).expect(401);
  });

  it('allows 30 requests a minute per person, then answers 422 until the minute passes', async () => {
    const agent = await t.factories.signIn(await t.factories.user());
    for (let i = 0; i < 30; i += 1) await agent.post('/api/translate').send({ text: `اسم ${i}` }).expect(200);
    const res = await agent.post('/api/translate').send({ text: 'اسم أخير' }).expect(422);
    expect(res.body.code).toBe('TRANSLATION_RATE_LIMITED');
  });
});
