import {
  ActivityLog,
  FavoriteFood,
  FitnessProfile,
  FoodExpense,
  FoodLog,
  PersonalRecord,
  StreakHistory,
  User,
  UserSettings,
  WaterLog,
  WeightHistory,
  WorkoutHistory,
  WorkoutPlan,
  WorkoutSetLog,
  WorkoutSplit,
  ExerciseModel,
} from '../models.js';
import {
  addDays,
  computeStreak,
  daySchedule,
  dateRange,
  localDate,
  recordMetrics,
} from '../../shared/domain.js';
import { recommendExercises } from '../../shared/catalog.js';
import { HttpError } from '../middleware.js';
import { localAiStatus } from './ai.js';
import { cloudConfigured } from './images.js';
export async function getProfile(userId: string) {
  const p = await FitnessProfile.findOne({ userId });
  if (!p) throw new HttpError(409, 'Complete your fitness profile first.');
  return p;
}
export function validatePast(date: string, timezone: string) {
  if (date > localDate(timezone)) throw new HttpError(400, 'Future records cannot be logged.');
}
export async function ensurePlan(userId: string, date: string, profile: any) {
  if (date < profile.startDate) return null;
  let plan = await WorkoutPlan.findOne({ userId, date });
  if (plan) return plan;
  const splits = await WorkoutSplit.find({ userId }).sort({ effective: 1 }).lean();
  const schedule = daySchedule(date, splits as any);
  const current = splits.filter((s: any) => s.effective <= date).at(-1);
  const exercises = schedule.rest
    ? []
    : recommendExercises(
        schedule.muscles,
        profile.equipment,
        profile.duration,
        profile.experience,
        profile.goal,
      );
  const media = await ExerciseModel.find({ id: { $in: exercises.map((e) => e.id) } }).lean();
  for (const exercise of exercises) {
    const m: any = media.find((m: any) => m.id === exercise.id);
    if (m)
      Object.assign(exercise, {
        imageUrl: m.imageUrl,
        videoUrl: m.videoUrl,
        attribution: m.attribution,
      });
  }
  plan = await WorkoutPlan.findOneAndUpdate(
    { userId, date },
    {
      $setOnInsert: {
        userId,
        date,
        splitName: current?.name || 'Recovery',
        rest: schedule.rest,
        muscles: schedule.muscles,
        exercises,
      },
    },
    { upsert: true, new: true },
  );
  return plan;
}
export async function refreshPerformance(userId: string, plan: any) {
  const logs = await WorkoutSetLog.find({ userId, planId: plan._id }).lean();
  const completed = plan.exercises.filter((e: any) => e.completed);
  const metrics = recordMetrics(logs as any);
  await WorkoutHistory.findOneAndUpdate(
    { userId, date: plan.date },
    {
      $set: {
        planId: plan._id,
        completedExercises: completed.map((e: any) => e.name),
        muscles: plan.muscles,
        duration: plan.duration,
        percentage: plan.exercises.length
          ? Math.round((completed.length / plan.exercises.length) * 100)
          : 0,
        volume: metrics.volume,
        sets: metrics.sets,
      },
    },
    { upsert: true },
  );
  for (const exercise of plan.exercises) {
    const confirmedPlans = await WorkoutPlan.find({
      userId,
      exercises: { $elemMatch: { id: exercise.id, completed: true } },
    }).select('_id');
    const history = await WorkoutSetLog.find({
      userId,
      exerciseId: exercise.id,
      completed: true,
      planId: { $in: confirmedPlans.map((p) => p._id) },
    })
      .sort({ date: 1 })
      .lean();
    if (!history.length) {
      await PersonalRecord.deleteOne({ userId, exerciseId: exercise.id });
      continue;
    }
    const record = recordMetrics(history as any);
    const best: any = history.find(
      (s: any) => (s.unit === 'lbs' ? s.weight * 0.45359237 : s.weight) === record.weight,
    );
    await PersonalRecord.findOneAndUpdate(
      { userId, exerciseId: exercise.id },
      {
        $set: {
          name: exercise.name,
          weight: record.weight,
          reps: record.reps,
          oneRepMax: record.oneRepMax,
          achievedAt: best?.date,
        },
      },
      { upsert: true },
    );
  }
}
export async function getState(userId: string, date?: string) {
  const profile = await getProfile(userId);
  const today = localDate(profile.timezone);
  date = date || today;
  validatePast(date, profile.timezone);
  const plan = await ensurePlan(userId, date, profile);
  const [
    user,
    settings,
    foods,
    splits,
    plans,
    activity,
    water,
    weights,
    expenses,
    favorites,
    records,
    histories,
    setLogs,
    recentFoods,
  ] = await Promise.all([
    User.findById(userId),
    UserSettings.findOne({ userId }).lean(),
    FoodLog.find({ userId, date }).sort({ createdAt: 1 }).lean(),
    WorkoutSplit.find({ userId }).sort({ effective: 1 }).lean(),
    WorkoutPlan.find({ userId, date: { $lte: today } })
      .select('date rest exercises')
      .lean(),
    ActivityLog.findOne({ userId, date }).lean(),
    WaterLog.find({ userId, date }).lean(),
    WeightHistory.find({ userId }).sort({ date: 1 }).lean(),
    FoodExpense.find({ userId, date: { $gte: today.slice(0, 7) + '-01', $lte: today } })
      .sort({ date: -1 })
      .lean(),
    FavoriteFood.find({ userId }).lean(),
    PersonalRecord.find({ userId }).sort({ name: 1 }).lean(),
    WorkoutHistory.find({ userId }).sort({ date: -1 }).limit(365).lean(),
    plan ? WorkoutSetLog.find({ userId, planId: plan._id }).lean() : Promise.resolve([]),
    FoodLog.find({ userId, date: { $gte: addDays(today, -29), $lte: today } }).lean(),
  ]);
  const streak = computeStreak(
    profile.startDate,
    today,
    splits as any,
    plans.filter((p: any) => p.exercises.some((e: any) => e.completed)).map((p: any) => p.date),
    user!.longestStreak,
    Object.fromEntries(plans.map((p: any) => [p.date, p.rest])),
  );
  await User.updateOne({ _id: userId }, { $max: { longestStreak: streak.longest } });
  if (streak.calendar.length)
    await StreakHistory.bulkWrite(
      streak.calendar.slice(-62).map((day) => ({
        updateOne: { filter: { userId, date: day.date }, update: { $set: day }, upsert: true },
      })),
    );
  const total = (rows: any[]) =>
    rows.reduce(
      (a, r) => ({
        calories: a.calories + r.calories,
        protein: a.protein + r.protein,
        carbs: a.carbs + r.carbs,
        fats: a.fats + r.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 },
    );
  const reports = dateRange(addDays(today, -29), today).map((d) => ({
    date: d,
    ...total(recentFoods.filter((f: any) => f.date === d)),
    logged: recentFoods.some((f: any) => f.date === d),
  }));
  const weekExpenses = await FoodExpense.find({
    userId,
    date: { $gte: addDays(today, -6), $lte: today },
  }).lean();
  const monthSpend = expenses.reduce((a, e: any) => a + e.amount, 0);
  const weekSpend = weekExpenses.reduce((a, e: any) => a + e.amount, 0);
  const daySpend = expenses
    .filter((e: any) => e.date === today)
    .reduce((a, e: any) => a + e.amount, 0);
  const spent =
    profile.budgetPeriod === 'daily'
      ? daySpend
      : profile.budgetPeriod === 'weekly'
        ? weekSpend
        : monthSpend;
  return {
    user: {
      id: String(user!._id),
      name: user!.name,
      email: user!.email,
      photoUrl: user!.photoUrl,
      onboardingCompleted: user!.onboardingCompleted,
    },
    profile: profile.toObject(),
    today,
    date,
    settings,
    foods,
    totals: total(foods),
    splits,
    plan,
    setLogs,
    activity,
    water: water.reduce((a, w: any) => a + w.amount, 0),
    waterLogs: water,
    weights,
    expenses,
    favorites,
    records,
    histories,
    streak,
    reports,
    budget: {
      day: daySpend,
      week: weekSpend,
      month: monthSpend,
      spent,
      remaining: profile.budget - spent,
    },
    services: {
      ai: (await localAiStatus()).ready,
      aiMessage: (await localAiStatus()).message,
      aiProvider: 'local',
      cloudImages: cloudConfigured(),
      email: !!process.env.SMTP_HOST,
    },
  };
}
