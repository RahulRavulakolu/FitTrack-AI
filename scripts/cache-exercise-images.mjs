import { readFile, writeFile, mkdir } from 'node:fs/promises';
const media = JSON.parse(await readFile('shared/exercise-media.json', 'utf8'));
await mkdir('public/exercises', { recursive: true });
let count = 0;
for (const [id, item] of Object.entries(media)) {
  const urls = item.images || [];
  const local = [];
  for (const [index, url] of urls.entries()) {
    if (!url.startsWith('https://wger.de/media/exercise-images/')) continue;
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) {
      console.log(`${id}: source unavailable (${response.status})`);
      continue;
    }
    const type = response.headers.get('content-type') || '';
    const ext = type.includes('png')
      ? 'png'
      : type.includes('jpeg')
        ? 'jpg'
        : type.includes('webp')
          ? 'webp'
          : type.includes('gif')
            ? 'gif'
            : null;
    if (!ext) continue;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 8 * 1024 * 1024) continue;
    const filename = `${id}-${index}.${ext}`;
    await writeFile(`public/exercises/${filename}`, bytes);
    local.push(`/exercises/${filename}`);
    count++;
  }
  if (local.length) {
    item.remoteImages = urls;
    item.images = local;
    item.imageUrl = local[0];
  }
}
await writeFile('shared/exercise-media.json', JSON.stringify(media, null, 2) + '\n');
console.log(
  `Cached ${count} licensed exercise images. Original sources retained in EXERCISE_MEDIA.md.`,
);
