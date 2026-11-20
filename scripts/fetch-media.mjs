import { writeFile, mkdir } from 'node:fs/promises';
const response = await fetch('https://wger.de/api/v2/exerciseinfo/?language=2&limit=1000');
if (!response.ok) throw new Error('Exercise catalog unavailable');
const body = await response.json();
await mkdir('.data', { recursive: true });
await writeFile('.data/wger.json', JSON.stringify(body));
const matches = body.results
  .map((e) => ({
    id: e.id,
    name: e.translations.find((t) => t.language === 2)?.name,
    images: e.images,
    videos: e.videos,
    license: e.license,
    author: e.license_author,
  }))
  .filter((e) =>
    /bench press|push.up|pulldown|dumbbell row|y.raise|shoulder press|lateral raise|pike|curl|pushdown|extension|squat|romanian|good morning|hip thrust|glute bridge|calf raise|dead bug|crunch|shrug|scapul/i.test(
      e.name || '',
    ),
  );
console.log(
  JSON.stringify(
    matches.map((e) => ({
      id: e.id,
      name: e.name,
      images: e.images?.length,
      videos: e.videos?.length,
    })),
    null,
    2,
  ),
);
