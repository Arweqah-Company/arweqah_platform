// Checks the Microsoft Entra settings before anyone tries the "Sign in with Microsoft" button:
// the values in .env, that the tenant exists, and that the client id + secret are accepted (a client-credentials token request,
// which needs no user). Usage: npm run microsoft:check
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HINTS = {
  AADSTS7000215: 'The client secret is wrong. Copy the secret VALUE (not the secret ID) from Certificates & secrets.',
  AADSTS7000222: 'The client secret has expired. Create a new one in Certificates & secrets and update MICROSOFT_CLIENT_SECRET.',
  AADSTS700016: 'The application (client) id was not found in this tenant. Check MICROSOFT_CLIENT_ID and that the app was registered in the company tenant.',
  AADSTS90002: 'The tenant was not found. Check MICROSOFT_TENANT_ID (the Directory (tenant) ID).',
  AADSTS900023: 'The tenant id is not valid. Use the Directory (tenant) ID GUID.',
  AADSTS700027: 'Microsoft does not accept the certificate signature. Upload the .crt to Certificates & secrets > Certificates, and make sure MICROSOFT_CERT_THUMBPRINT and the private key are the ones from scripts/generate-microsoft-certificate.sh.',
  AADSTS700024: 'The certificate assertion is outside its validity time. Check the clock of this machine.',
  AADSTS7000112: 'The application is disabled in the tenant. Ask the tenant admin to enable it.',
};

function readEnv() {
  const env = { ...process.env };
  if (!existsSync('.env')) return env;
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && env[match[1]] === undefined) env[match[1]] = match[2].replace(/^"(.*)"$/, '$1').trim();
  }
  return env;
}

// The same signing code the API uses (plain TypeScript syntax, which Node runs directly).
async function certificateCredential(tokenEndpoint) {
  // The file has no type syntax; Node treats .ts in this CommonJS package as CJS, so load a temporary .mts copy (Node strips the types).
  const source = readFileSync(new URL('../apps/api/src/core/auth/infrastructure/microsoft-certificate-assertion.ts', import.meta.url), 'utf8');
  const dir = mkdtempSync(join(tmpdir(), 'ms-assertion-'));
  const file = join(dir, 'assertion.mts');
  writeFileSync(file, source);
  const { signMicrosoftClientAssertion } = await import(pathToFileURL(file).href);
  rmSync(dir, { recursive: true, force: true });
  const assertion = signMicrosoftClientAssertion({ clientId, tokenEndpoint, privateKeyPem, thumbprint });
  return { client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer', client_assertion: assertion };
}

const problems = [];
const ok = (message) => console.log(`  ok    ${message}`);
const fail = (message) => { problems.push(message); console.log(`  FAIL  ${message}`); };

const env = readEnv();
const { MICROSOFT_CLIENT_ID: clientId, MICROSOFT_CLIENT_SECRET: secret, MICROSOFT_TENANT_ID: tenant, API_URL: apiUrl, APP_URL: appUrl } = env;
const thumbprint = env.MICROSOFT_CERT_THUMBPRINT;
const keyFile = env.MICROSOFT_CERT_PRIVATE_KEY_FILE;
const privateKeyPem = keyFile && existsSync(keyFile) ? readFileSync(keyFile, 'utf8') : env.MICROSOFT_CERT_PRIVATE_KEY?.replace(/\\n/g, '\n');
const useCertificate = !secret && !!thumbprint && !!privateKeyPem;

console.log('Settings');
if (!clientId || !tenant || (!secret && !useCertificate)) {
  fail('set MICROSOFT_CLIENT_ID and MICROSOFT_TENANT_ID, and either MICROSOFT_CLIENT_SECRET or MICROSOFT_CERT_THUMBPRINT with MICROSOFT_CERT_PRIVATE_KEY_FILE (docs/microsoft-sign-in.md)');
  if (keyFile && !existsSync(keyFile)) fail(`MICROSOFT_CERT_PRIVATE_KEY_FILE does not exist: ${keyFile}`);
} else {
  GUID.test(clientId) ? ok('client id is a GUID') : fail('MICROSOFT_CLIENT_ID is not a GUID (copy "Application (client) ID")');
  GUID.test(tenant) ? ok('tenant id is a GUID (common / organizations / consumers are refused)') : fail('MICROSOFT_TENANT_ID must be the company Directory (tenant) ID GUID');
  if (useCertificate) /^[0-9a-f]{40}$/i.test(thumbprint) ? ok('certificate thumbprint and private key are set (no client secret needed)') : fail('MICROSOFT_CERT_THUMBPRINT must be the 40-character SHA-1 thumbprint');
  else secret.length >= 20 ? ok('client secret is set') : fail('MICROSOFT_CLIENT_SECRET looks too short: copy the secret VALUE');
}
console.log(`  info  the redirect URI to register in Entra is: ${apiUrl ?? '<API_URL>'}/api/auth/callback/microsoft`);
if (appUrl && apiUrl && appUrl !== apiUrl) console.log('  warn  APP_URL and API_URL differ: the browser reaches the API through the web app, so they are normally the same');

if (!problems.length) {
  console.log('Microsoft');
  try {
    const discovery = await fetch(`https://login.microsoftonline.com/${tenant}/v2.0/.well-known/openid-configuration`);
    discovery.ok ? ok('the tenant exists') : fail(`the tenant was not found (HTTP ${discovery.status}); check MICROSOFT_TENANT_ID`);
    const tokenEndpoint = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
    const credential = useCertificate ? await certificateCredential(tokenEndpoint) : { client_secret: secret };
    const token = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, grant_type: 'client_credentials', scope: 'https://graph.microsoft.com/.default', ...credential }),
    });
    const body = await token.json();
    if (token.ok) ok(useCertificate ? 'client id and certificate are accepted by this tenant' : 'client id and secret are accepted by this tenant');
    else {
      const code = String(body.error_description ?? '').match(/AADSTS\d+/)?.[0] ?? body.error;
      fail(`${code}: ${HINTS[code] ?? String(body.error_description ?? '').split('\r\n')[0]}`);
    }
  } catch (error) {
    fail(`could not reach login.microsoftonline.com (${error.message}); check the internet connection`);
  }
}

if (problems.length) {
  console.error(`\nmicrosoft check found ${problems.length} problem(s). Fix them, then run it again.`);
  process.exit(1);
}
console.log('\nmicrosoft check passed. Sign in with Microsoft from /login using an account whose e-mail matches an employee work e-mail.');
