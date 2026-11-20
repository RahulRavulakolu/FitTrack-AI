import { readFile, writeFile } from 'node:fs/promises';
const data = JSON.parse(await readFile('.data/wger.json', 'utf8'));
// Reviewed name/equipment matches only. Never substitute a different exercise's demonstration.
const mapping = {
  'bench-press': 73,
  'incline-press': 537,
  'push-up': 1551,
  'db-row': 81,
  'shoulder-press': 567,
  'lateral-raise': 348,
  curl: 92,
  pushdown: 805,
  'overhead-extension': 211,
  squat: 1801,
  'goblet-squat': 203,
  rdl: 1652,
  'hip-thrust': 1642,
  bridge: 265,
  'calf-raise': 622,
  crunch: 167,
  shrug: 572,
};
const licenses = {
  1: 'CC BY-SA 3.0',
  2: 'CC BY-SA 4.0',
  3: 'CC BY 3.0',
  4: 'CC BY 4.0',
  5: 'Public domain',
};
const result = {};
for (const [key, id] of Object.entries(mapping)) {
  const e = data.results.find((e) => e.id === id);
  if (!e) continue;
  const images = e.images.filter((i) => i.is_ai_generated === false);
  const video = e.videos.find((v) => /\.mp4$/i.test(v.video)) || e.videos[0];
  const credits = [
    ...new Set(
      [...images, ...(video ? [video] : [])].map(
        (m) =>
          `${m.license_author || e.license_author} · ${licenses[m.license] || e.license.short_name}`,
      ),
    ),
  ];
  result[key] = {
    imageUrl: images[0]?.image || '',
    images: images.map((i) => i.image),
    videoUrl: video?.video || '',
    attribution: `Via wger · ${credits.join('; ')}`,
    sourceUrl: `https://wger.de/en/exercise/${id}/view/`,
  };
}
await writeFile('shared/exercise-media.json', JSON.stringify(result, null, 2) + '\n');
await writeFile(
  'EXERCISE_MEDIA.md',
  '# Exercise media attribution\n\nOnly explicitly non-AI images from the wger API are included. Links reference original media without modifying it. Exercise instructions in the app are independently written. Database entries without matched media retain text instructions and a source guide.\n\n' +
    Object.entries(result)
      .map(
        ([key, m]) =>
          `## ${key}\n\n${m.attribution}\n\nSource: ${m.sourceUrl}\n\n${[...m.images, m.videoUrl].filter(Boolean).join('\n\n')}`,
      )
      .join('\n\n') +
    '\n',
);
console.log(`Matched real media for ${Object.keys(result).length} exercises.`);
