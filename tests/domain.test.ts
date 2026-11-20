import { describe, it, expect } from 'vitest';
import {
  nutrition,
  computeStreak,
  localDate,
  recordMetrics,
  splitTemplates,
  splitSchema,
  dateSchema,
  addDays,
  type TemporalSplit,
} from '../shared/domain';
import { recommendExercises } from '../shared/catalog';
describe('nutrition estimates', () => {
  it('uses Mifflin–St Jeor and reconciles calorie energy with macros', () => {
    const n = nutrition({
      weight: 70,
      height: 175,
      age: 30,
      gender: 'male',
      activity: 'moderate',
      goal: 'maintenance',
    });
    expect(n.bmr).toBe(1649);
    expect(n.tdee).toBe(2556);
    expect(Math.abs(n.protein * 4 + n.carbs * 4 + n.fats * 9 - n.calories)).toBeLessThanOrEqual(4);
    expect(n.water).toBe(2450);
  });
  it('uses moderate deficit and surplus', () => {
    const p = {
      weight: 70,
      height: 175,
      age: 30,
      gender: 'female' as const,
      activity: 'light' as const,
    };
    const base = nutrition({ ...p, goal: 'maintenance' });
    expect(nutrition({ ...p, goal: 'bulking' }).calories - base.calories).toBe(250);
    expect(nutrition({ ...p, goal: 'cutting' }).calories).toBeGreaterThanOrEqual(1200);
  });
});
describe('calendar streak invariants', () => {
  const splits: TemporalSplit[] = [
    {
      name: 'Test',
      effective: '2026-11-02',
      days: [
        { rest: false, muscles: ['Chest'] },
        { rest: false, muscles: ['Back'] },
        { rest: true, muscles: [] },
        { rest: false, muscles: ['Quadriceps'] },
        { rest: false, muscles: ['Shoulders'] },
        { rest: true, muscles: [] },
        { rest: true, muscles: [] },
      ],
    },
  ];
  it('counts duplicate completions once and does not count future completions', () => {
    const s = computeStreak('2026-11-02', '2026-11-02', splits, [
      '2026-11-02',
      '2026-11-02',
      '2026-11-03',
    ]);
    expect(s.current).toBe(1);
    expect(s.total).toBe(1);
  });
  it('preserves across a rest day and freezes once', () => {
    const s = computeStreak('2026-11-02', '2026-11-05', splits, ['2026-11-02']);
    expect(s.current).toBe(1);
    expect(s.frozen).toBe(true);
    expect(s.calendar.find((d) => d.date === '2026-11-04')?.status).toBe('rest');
  });
  it('resets after two scheduled misses separated by rest, then restarts', () => {
    expect(computeStreak('2026-11-02', '2026-11-06', splits, ['2026-11-02']).current).toBe(0);
    const s = computeStreak('2026-11-02', '2026-11-06', splits, ['2026-11-02', '2026-11-06'], 8);
    expect(s.current).toBe(1);
    expect(s.longest).toBe(8);
  });
  it('a completed session clears the missed-day freeze', () => {
    const s = computeStreak('2026-11-02', '2026-11-06', splits, ['2026-11-02', '2026-11-05']);
    expect(s.current).toBe(2);
    expect(s.frozen).toBe(false);
  });
  it('does not treat today as missed and respects historical day snapshots', () => {
    expect(computeStreak('2026-11-02', '2026-11-03', splits, ['2026-11-02']).frozen).toBe(false);
    const s = computeStreak('2026-11-02', '2026-11-06', splits, ['2026-11-02'], 0, {
      '2026-11-03': true,
      '2026-11-05': true,
    });
    expect(s.current).toBe(1);
    expect(s.frozen).toBe(false);
  });
  it('uses effective schedules and local calendar boundaries', () => {
    expect(localDate('Asia/Kolkata', new Date('2026-11-15T20:00:00Z'))).toBe('2026-11-16');
    expect(localDate('America/New_York', new Date('2026-11-15T02:00:00Z'))).toBe('2026-11-14');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    const newer = { ...splitTemplates.starter, effective: '2026-11-05' };
    const s = computeStreak('2026-11-02', '2026-11-06', [...splits, newer], ['2026-11-02']);
    expect(s.calendar.find((d) => d.date === '2026-11-05')?.status).toBe('rest');
  });
});
describe('plans and records', () => {
  it('rejects contradictory rest and muscle choices', () => {
    expect(
      splitSchema.safeParse({
        ...splitTemplates.starter,
        days: Array(7).fill({ rest: true, muscles: ['Chest'] }),
      }).success,
    ).toBe(false);
    expect(dateSchema.safeParse('2026-02-30').success).toBe(false);
  });
  it('ignores unconfirmed sets and normalizes pounds', () => {
    const r = recordMetrics([
      { weight: 100, reps: 10, unit: 'lbs', completed: true },
      { weight: 900, reps: 100, unit: 'kg', completed: false },
    ]);
    expect(r.weight).toBeCloseTo(45.359237);
    expect(r.reps).toBe(10);
    expect(r.volume).toBeCloseTo(453.59237);
    expect(r.oneRepMax).toBeCloseTo(60.47898);
  });
  it('generates stable plans constrained by equipment and target muscles', () => {
    const args = [['Chest', 'Back'], 'bodyweight', 30, 'beginner', 'maintenance'] as const;
    const a = recommendExercises(
      [...args[0]],
      ...(args.slice(1) as [string, number, string, string]),
    );
    expect(a.every((e) => e.equipment === 'bodyweight')).toBe(true);
    expect(a.map((e) => e.muscle)).toContain('Chest');
    expect(a.map((e) => e.muscle)).toContain('Back');
    expect(a).toEqual(
      recommendExercises(['Chest', 'Back'], 'bodyweight', 30, 'beginner', 'maintenance'),
    );
  });
});
