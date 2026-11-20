import sharp from 'sharp';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const mark =
  '<path d="M376 696V328h280v82H462v68h161v80H462v138z" fill="#c0ef80"/><path d="m581 659 61-96 72 46-61 96z" fill="#b4a2ee"/>';
const svg = (background = true, splash = false) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${background ? '<rect width="1024" height="1024" fill="#111512"/>' : ''}<g ${splash ? 'transform="translate(307 307) scale(.4)"' : ''}>${mark}</g></svg>`,
  );
const png = async (path, size, source = svg()) => {
  await mkdir(join(path, '..'), { recursive: true });
  await sharp(source).resize(size, size).png().toFile(path);
};
const resources = 'android/app/src/main/res';
for (const [density, size, foreground] of [
  ['mdpi', 48, 108],
  ['hdpi', 72, 162],
  ['xhdpi', 96, 216],
  ['xxhdpi', 144, 324],
  ['xxxhdpi', 192, 432],
]) {
  for (const name of ['ic_launcher', 'ic_launcher_round'])
    await png(`${resources}/mipmap-${density}/${name}.png`, size);
  await png(`${resources}/mipmap-${density}/ic_launcher_foreground.png`, foreground, svg(false));
}
await writeFile(
  `${resources}/values/ic_launcher_background.xml`,
  '<?xml version="1.0" encoding="utf-8"?><resources><color name="ic_launcher_background">#111512</color></resources>',
);
for (const entry of await readdir(resources, { withFileTypes: true })) {
  if (entry.isDirectory() && entry.name.startsWith('drawable')) {
    const files = await readdir(`${resources}/${entry.name}`);
    if (files.includes('splash.png'))
      await png(`${resources}/${entry.name}/splash.png`, 1024, svg(true, true));
  }
}
await png('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', 1024);
for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'])
  await png(`ios/App/App/Assets.xcassets/Splash.imageset/${name}`, 2732, svg(true, true));
await mkdir('public', { recursive: true });
await writeFile('public/fittrack-icon.svg', svg());
console.log('Android and iOS app icons and launch images generated.');
