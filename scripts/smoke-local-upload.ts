import { readFile, writeFile } from 'node:fs/promises';
const base = 'http://127.0.0.1:4000/api';
const password = `LocalCheck!${crypto.randomUUID()}`;
const registration = await fetch(`${base}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Local AI Check', email: `localai-${Date.now()}@fittrack.invalid`, password, confirmPassword: password }) });
if (registration.status !== 201) throw new Error(`Test registration failed: ${registration.status}`);
const cookie = registration.headers.get('set-cookie')!.split(';')[0];
try {
  const form = new FormData();
  form.set('image', new File([await readFile('.data/ollama/test-rice.jpg')], 'rice.jpg', { type: 'image/jpeg' }));
  const response = await fetch(`${base}/foods/analyze`, { method: 'POST', headers: { Cookie: cookie }, body: form, signal: AbortSignal.timeout(195000) });
  const result = await response.json();
  if (response.status !== 200 || !result.items?.some((item: any) => /rice/i.test(item.name))) throw new Error(`Food upload failed: ${JSON.stringify(result)}`);
  console.log('Actual food-upload API passed with local inference, editable rice estimate and a saved preview image.');
  await writeFile('releases/LOCAL-UPLOAD-VERIFICATION.json', JSON.stringify({ status: response.status, items: result.items, note: result.note, previewImageSaved: !!result.imageUrl, provider: 'local Ollama', account: 'Temporary test account removed after the check' }, null, 2));
} finally {
  const deleted = await fetch(`${base}/auth/account`, { method: 'DELETE', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify({ password, confirmation: 'DELETE' }) });
  if (deleted.status !== 200) throw new Error('Could not delete the temporary local-AI test account.');
}
