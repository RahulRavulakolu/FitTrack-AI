import { afterEach, describe, it, expect, vi } from 'vitest';
import { analyzeFood, generateWorkout, assistantAnswer } from '../server/services/ai';
function provider(value: unknown) {
  vi.stubEnv('LOCAL_AI_ENABLED', 'true');
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ message: { content: JSON.stringify(value) }, done: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
describe('local Ollama contracts (mocked inference)', () => {
  it('returns editable estimated items without writing any database records', async () => {
    const item = {
      name: 'Test rice',
      quantity: 150,
      unit: 'g',
      calories: 200,
      protein: 4,
      carbs: 45,
      fats: 1,
      fiber: 1,
    };
    const fetch = provider({ items: [item], note: 'Visual estimate; verify serving size.' });
    expect(await analyzeFood(Buffer.from('test-image'))).toEqual({
      items: [item],
      note: 'Visual estimate; verify serving size.',
    });
    const request = JSON.parse(fetch.mock.calls[0][1]!.body as string);
    expect(request.format.type).toBe('object');
    expect(request.stream).toBe(false);
    expect(request.messages[1].images).toEqual([Buffer.from('test-image').toString('base64')]);
    expect(fetch.mock.calls[0][0]).toBe('http://127.0.0.1:11434/api/chat');
    expect(fetch.mock.calls[0][1]!.headers).not.toHaveProperty('Authorization');
    expect(request.messages[0].content).toContain('rough estimated');
  });
  it('rejects invalid, negative or malformed nutritional output', async () => {
    provider({
      items: [
        {
          name: 'Bad output',
          quantity: 1,
          unit: 'g',
          calories: -50,
          protein: 0,
          carbs: 0,
          fats: 0,
          fiber: 0,
        },
      ],
      note: 'Invalid',
    });
    await expect(analyzeFood(Buffer.from('test'))).rejects.toThrow('invalid nutrition');
  });
  it('never fabricates an answer when the upstream service fails', async () => {
    vi.stubEnv('LOCAL_AI_ENABLED', 'true');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('error', { status: 429 }));
    await expect(assistantAnswer('Calories?', { totals: { calories: 0 } })).rejects.toThrow(
      'could not complete',
    );
  });
  it('rejects cloud models and remote inference addresses without making requests', async () => {
    const fetch = provider({ answer: 'unused' });
    vi.stubEnv('OLLAMA_TEXT_MODEL', 'qwen3:cloud');
    await expect(assistantAnswer('Hello', {})).rejects.toThrow('downloaded local');
    vi.stubEnv('OLLAMA_TEXT_MODEL', 'qwen3-vl:2b-instruct');
    vi.stubEnv('OLLAMA_URL', 'https://api.example.com');
    await expect(assistantAnswer('Hello', {})).rejects.toThrow('loopback');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('explains missing models without requesting a key or fabricating food', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 404 }));
    await expect(analyzeFood(Buffer.from('test'))).rejects.toThrow('Setup-Free-AI.cmd');
  });
  it('passes the authenticated context and instructs the assistant to acknowledge missing records', async () => {
    const fetch = provider({ answer: 'You have logged 400 kcal today.' });
    const context = { totals: { calories: 400 }, foods: [{ name: 'Real saved food' }] };
    expect((await assistantAnswer('How much have I eaten?', context)).answer).toContain('400');
    const request = JSON.parse(fetch.mock.calls[0][1]!.body as string);
    expect(JSON.parse(request.messages[1].content).context).toEqual(context);
    expect(request.messages[0].content).toContain('Never invent logs');
  });
  it('rejects duplicate exercises and routines that omit selected muscles', async () => {
    const exercise = { id: 'bench-press', sets: 3, reps: '8–12', rest: 90 };
    provider({ exercises: [exercise, exercise] });
    await expect(
      generateWorkout({ equipment: 'gym', duration: 45 }, ['Chest'], []),
    ).rejects.toThrow('duplicate');
    vi.restoreAllMocks();
    provider({ exercises: [exercise] });
    await expect(
      generateWorkout({ equipment: 'gym', duration: 45 }, ['Chest', 'Back'], []),
    ).rejects.toThrow('training constraints');
  });
  it('only accepts catalog IDs and safe ranges for an equipment-matched routine', async () => {
    provider({ exercises: [{ id: 'push-up', sets: 2, reps: '8–12', rest: 90 }] });
    const routine = await generateWorkout(
      { equipment: 'bodyweight', duration: 30, experience: 'beginner', goal: 'maintenance' },
      ['Chest'],
      [],
    );
    expect(routine[0].name).toBe('Push-up');
    expect(routine[0].completed).toBe(false);
    expect(routine[0].equipment).toBe('bodyweight');
  });
});
