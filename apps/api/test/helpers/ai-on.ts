import { CorePermission } from '@arweqah-platform/shared';
import { ADMIN_MODE_GRANT } from '../factories/factories';
import type { TestContext } from '../setup/test-app';

const AI_ADMIN_KEYS = [CorePermission.IntegrationsAiView, CorePermission.IntegrationsAiEdit, CorePermission.IntegrationsAiTest, CorePermission.IntegrationsAiActivate];

/** The key and model an administrator types into the AI settings in the tests. */
export const AI_VALUES = { apiKey: 'sk-ant-api03-e2e-key-1234567890', model: 'claude-opus-5-5' };

/** An administrator tries, saves and switches on the Anthropic service (against the fake client), then forgets the calls that made. */
export async function switchAiOn(t: TestContext): Promise<void> {
  const admin = await t.factories.signInAdminMode(await t.factories.user({ grants: [ADMIN_MODE_GRANT, ...AI_ADMIN_KEYS.map((key) => ({ key, scope: 'all' as const }))] }));
  await admin.post('/api/integrations/ai/anthropic/test').send({ values: AI_VALUES }).expect(200);
  await admin.put('/api/integrations/ai/anthropic').send({ values: AI_VALUES }).expect(200);
  await admin.post('/api/integrations/ai/anthropic/activate').expect(200);
  t.ai.reset();
}
