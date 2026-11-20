import { z } from 'zod';

export const muscles = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Quadriceps',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Abs/Core',
  'Traps',
] as const;
export const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const activityLevels = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extreme: 1.9,
};
export const goals = ['bulking', 'cutting', 'maintenance', 'recomposition'] as const;
const num = (min: number, max: number) => z.coerce.number().finite().min(min).max(max);
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (x) => !Number.isNaN(Date.parse(x)) && new Date(x).toISOString().slice(0, 10) === x,
    'Invalid calendar date',
  );
export const timezoneSchema = z
  .string()
  .max(80)
  .refine((x) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: x });
      return true;
    } catch {
      return false;
    }
  }, 'Invalid timezone');
export const targetSchema = z.object({
  calories: num(1000, 7000),
  protein: num(20, 400),
  carbs: num(20, 1000),
  fats: num(20, 250),
  water: num(500, 8000),
});
export const profileSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    age: num(18, 100).int(),
    gender: z.enum(['male', 'female', 'other']),
    height: num(100, 250),
    weight: num(30, 350),
    activity: z.enum(['sedentary', 'light', 'moderate', 'very', 'extreme']),
    goal: z.enum(goals),
    budget: num(0, 1000000),
    budgetPeriod: z.enum(['daily', 'weekly', 'monthly']),
    preference: z.enum(['vegetarian', 'non-vegetarian', 'eggetarian', 'vegan']),
    allergies: z.string().max(500).default(''),
    restrictions: z.string().max(500).default(''),
    dislikes: z.string().max(500).default(''),
    walking: z.string().max(300).default(''),
    experience: z.enum(['beginner', 'intermediate', 'advanced']),
    equipment: z.enum(['gym', 'dumbbells', 'bodyweight']),
    duration: num(15, 120).int(),
    recovery: z.string().max(500).default(''),
    timezone: timezoneSchema,
    customTargets: z.boolean().default(false),
    targets: targetSchema.optional(),
  })
  .refine((p) => !p.customTargets || !!p.targets, {
    message: 'Enter all custom nutrition targets',
    path: ['targets'],
  });
export type FitnessProfile = z.infer<typeof profileSchema>;
export type Targets = z.infer<typeof targetSchema>;
export function nutrition(
  p: Pick<FitnessProfile, 'weight' | 'height' | 'age' | 'gender' | 'activity' | 'goal'>,
) {
  const sexOffset = p.gender === 'male' ? 5 : p.gender === 'female' ? -161 : -78;
  const bmr = Math.round(10 * p.weight + 6.25 * p.height - 5 * p.age + sexOffset);
  const tdee = Math.round(bmr * activityLevels[p.activity]);
  const adjustment = {
    bulking: 250,
    cutting: -Math.min(400, tdee * 0.2),
    maintenance: 0,
    recomposition: -150,
  }[p.goal];
  const calories = Math.max(p.gender === 'female' ? 1200 : 1500, Math.round(tdee + adjustment));
  const protein = Math.min(
    Math.round(p.weight * (p.goal === 'cutting' || p.goal === 'recomposition' ? 2 : 1.8)),
    Math.round((calories * 0.35) / 4),
  );
  const fats = Math.round((calories * 0.27) / 9);
  const carbs = Math.max(20, Math.round((calories - protein * 4 - fats * 9) / 4));
  return {
    bmr,
    tdee,
    calories,
    protein,
    carbs,
    fats,
    water: Math.min(5000, Math.round((p.weight * 35) / 50) * 50),
  };
}
export const foodSchema = z.object({
  name: z.string().trim().min(1).max(150),
  quantity: num(0.01, 100000),
  unit: z.string().trim().min(1).max(30),
  meal: z.enum(['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner', 'Other']),
  calories: num(0, 10000),
  protein: num(0, 1000),
  carbs: num(0, 2000),
  fats: num(0, 1000),
  fiber: num(0, 500).default(0),
  source: z.enum(['manual', 'AI']).default('manual'),
  imageUrl: z.string().max(1000).default(''),
  date: dateSchema,
});
export type FoodInput = z.infer<typeof foodSchema>;
export const splitDaySchema = z
  .object({ rest: z.boolean(), muscles: z.array(z.enum(muscles)).max(5) })
  .refine(
    (d) => (d.rest ? d.muscles.length === 0 : d.muscles.length > 0),
    'Choose rest OR one or more muscles',
  )
  .refine((d) => new Set(d.muscles).size === d.muscles.length, 'Duplicate muscles');
export const splitSchema = z.object({
  name: z.string().trim().min(1).max(80),
  days: z.array(splitDaySchema).length(7),
});
export type Split = z.infer<typeof splitSchema>;
export const splitTemplates: Record<string, Split> = {
  single: {
    name: 'Single muscle',
    days: [
      ['Chest'],
      ['Back'],
      ['Shoulders'],
      ['Biceps', 'Triceps'],
      ['Quadriceps', 'Hamstrings', 'Calves'],
      ['Abs/Core'],
      [],
    ].map((m) => ({ rest: !m.length, muscles: m as (typeof muscles)[number][] })),
  },
  double: {
    name: 'Double muscle',
    days: [
      ['Chest', 'Triceps'],
      ['Back', 'Biceps'],
      ['Quadriceps', 'Abs/Core'],
      ['Shoulders', 'Triceps'],
      ['Chest', 'Biceps'],
      ['Back', 'Abs/Core'],
      [],
    ].map((m) => ({ rest: !m.length, muscles: m as (typeof muscles)[number][] })),
  },
  ppl: {
    name: 'Push / Pull / Legs',
    days: [
      ['Chest', 'Shoulders', 'Triceps'],
      ['Back', 'Biceps'],
      ['Quadriceps', 'Hamstrings', 'Glutes'],
      ['Chest', 'Shoulders', 'Triceps'],
      ['Back', 'Biceps'],
      ['Quadriceps', 'Hamstrings', 'Calves'],
      [],
    ].map((m) => ({ rest: !m.length, muscles: m as (typeof muscles)[number][] })),
  },
  starter: {
    name: 'Balanced foundations',
    days: [
      ['Chest', 'Back'],
      [],
      ['Quadriceps', 'Hamstrings'],
      [],
      ['Shoulders', 'Biceps', 'Triceps'],
      [],
      [],
    ].map((m) => ({ rest: !m.length, muscles: m as (typeof muscles)[number][] })),
  },
};
export function localDate(timezone: string, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
export function addDays(date: string, n: number) {
  const d = new Date(date + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function weekday(date: string) {
  return (new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7;
}
export function dateRange(start: string, end: string) {
  const result: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    result.push(d);
    if (result.length > 40000) break;
  }
  return result;
}
export type TemporalSplit = Split & { effective: string };
export function daySchedule(date: string, splits: TemporalSplit[]) {
  const s = [...splits]
    .sort((a, b) => a.effective.localeCompare(b.effective))
    .filter((s) => s.effective <= date)
    .at(-1);
  return s?.days[weekday(date)] ?? { rest: true, muscles: [] };
}
export function computeStreak(
  start: string,
  today: string,
  splits: TemporalSplit[],
  completed: string[],
  historicLongest = 0,
  snapshots: Record<string, boolean> = {},
) {
  const dates = new Set(completed.filter((d) => d <= today));
  let current = 0,
    longest = historicLongest,
    misses = 0;
  const calendar: {
    date: string;
    status: 'completed' | 'rest' | 'missed' | 'pending';
    streak: number;
    frozen: boolean;
  }[] = [];
  for (const date of dateRange(start, today)) {
    const rest = snapshots[date] ?? daySchedule(date, splits).rest;
    let status: (typeof calendar)[number]['status'];
    if (dates.has(date)) {
      current++;
      longest = Math.max(longest, current);
      misses = 0;
      status = 'completed';
    } else if (rest) status = 'rest';
    else if (date === today) status = 'pending';
    else {
      status = 'missed';
      misses++;
      if (misses >= 2) current = 0;
    }
    calendar.push({ date, status, streak: current, frozen: misses === 1 && current > 0 });
  }
  return { current, longest, total: dates.size, frozen: misses === 1 && current > 0, calendar };
}
export function recordMetrics(
  sets: { weight: number; reps: number; unit: string; completed: boolean }[],
) {
  return sets
    .filter((s) => s.completed)
    .reduce(
      (a, s) => {
        const kg = s.unit === 'lbs' ? s.weight * 0.45359237 : s.weight;
        return {
          weight: Math.max(a.weight, kg),
          reps: Math.max(a.reps, s.reps),
          oneRepMax: Math.max(a.oneRepMax, s.reps <= 12 ? kg * (1 + s.reps / 30) : 0),
          volume: a.volume + kg * s.reps,
          sets: a.sets + 1,
        };
      },
      { weight: 0, reps: 0, oneRepMax: 0, volume: 0, sets: 0 },
    );
}
