import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { analyzeFood, assistantAnswer, generateWorkout } from '../server/services/ai';

// Public-domain test photograph by Douglas Perkins (CC0), not a user's photo.
// https://commons.wikimedia.org/wiki/File:Bowl_of_white_rice_01.jpg
const original = await readFile('.data/ollama/test-rice.jpg');
const photo = await sharp(original).resize(768, 768, { fit: 'inside', withoutEnlargement: true }).webp().toBuffer();
const started = Date.now();
const food = await analyzeFood(photo);
if (!food.items.some(item => /rice/i.test(item.name))) throw new Error('The test food was not recognized as rice.');
console.log('Local vision recognized rice and returned editable nutrition:', JSON.stringify(food));
const answer = await assistantAnswer('How many calories have I logged today?', { totals: { calories: 400 }, foods: [{ name: 'Test meal', calories: 400 }], note: 'Isolated test context; not actual user records.' });
if (!answer.answer.includes('400')) throw new Error('The assistant did not ground its answer in the supplied total.');
console.log('Local assistant:', answer.answer);
const workout = await generateWorkout({ equipment: 'bodyweight', experience: 'beginner', duration: 30, recovery: '', goal: 'maintenance' }, ['Chest'], []);
console.log('Local routine passed catalog and safety validation:', workout.map(exercise => exercise.name).join(', '));
await writeFile('releases/LOCAL-AI-VERIFICATION.json', JSON.stringify({ model: 'qwen3-vl:2b-instruct', provider: 'local Ollama', food, answer, workout: workout.map(({ id, name, sets, reps }) => ({ id, name, sets, reps })), durationSeconds: (Date.now() - started) / 1000, note: 'Actual local inference on a CC0 rice image and isolated test context. No user records changed.' }, null, 2));
