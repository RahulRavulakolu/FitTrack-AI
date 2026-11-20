import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import { resolve } from 'node:path';
import crypto from 'node:crypto';
import { auth, HttpError } from '../middleware.js';
import {
  ActivityLog,
  FavoriteFood,
  FitnessProfile,
  FoodExpense,
  FoodLog,
  User,
  UserSettings,
  WaterLog,
  WeightHistory,
  WorkoutPlan,
  WorkoutSetLog,
  WorkoutSplit,
  privateModels,
} from '../models.js';
import {
  dateSchema,
  profileSchema,
  nutrition,
  foodSchema,
  splitSchema,
  splitTemplates,
  localDate,
  addDays,
} from '../../shared/domain.js';
import {
  ensurePlan,
  getProfile,
  getState,
  refreshPerformance,
  validatePast,
} from '../services/tracking.js';
import { cleanImage, saveImage, removePhoto } from '../services/images.js';
import { aiConfigured, analyzeFood, generateWorkout, assistantAnswer } from '../services/ai.js';
import { publicUser } from './auth.js';
export const trackingRouter = Router();
trackingRouter.use(auth);
// Serialize same-user mutations so split edits and completion cannot race within this process.
const queues = new Map<string, Promise<void>>();
trackingRouter.use(async (req, res, next) => {
  if (req.method === 'GET') return next();
  const id = String(res.locals.user._id);
  const previous = queues.get(id) || Promise.resolve();
  let release!: () => void;
  const turn = new Promise<void>((r) => (release = r));
  const tail = previous.then(() => turn);
  queues.set(id, tail);
  await previous;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    release();
    if (queues.get(id) === tail) queues.delete(id);
  };
  res.once('finish', finish);
  res.once('close', finish);
  next();
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 3 },
});
const aiLimit = rateLimit({
  windowMs: 60000,
  limit: 8,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Please wait a minute before another AI request.' },
});
const id = (res: any) => String(res.locals.user._id);
async function validDate(userId: string, date: string) {
  const p = await getProfile(userId);
  validatePast(date, p.timezone);
  return p;
}
async function requireAi(userId: string) {
  if (!aiConfigured())
    throw new HttpError(
      503,
      'AI is disabled on the FitTrack server. Manual tracking remains available.',
    );
  const s = await UserSettings.findOne({ userId });
  if (s?.localAiEnabled === false)
    throw new HttpError(403, 'Enable local AI in Profile → Privacy & AI before using AI features.');
}
trackingRouter.get('/state', async (req, res) =>
  res.json(await getState(id(res), req.query.date ? dateSchema.parse(req.query.date) : undefined)),
);
trackingRouter.put('/profile', async (req, res) => {
  const data = profileSchema.parse(req.body);
  const userId = id(res);
  const old = await FitnessProfile.findOne({ userId });
  const calculated = nutrition(data);
  const today = localDate(data.timezone);
  if (old?.customTargets && !data.customTargets && req.body.confirmReplaceTargets !== true)
    throw new HttpError(400, 'Confirm before replacing your customized targets.');
  if (old && old.timezone !== data.timezone)
    throw new HttpError(
      400,
      'Timezone is fixed after onboarding to keep historical streak dates consistent.',
    );
  const targets = data.customTargets ? data.targets : calculated;
  await FitnessProfile.findOneAndUpdate(
    { userId },
    {
      $set: { ...data, targets, bmr: calculated.bmr, tdee: calculated.tdee },
      $setOnInsert: { startDate: today },
    },
    { upsert: true, new: true, runValidators: true },
  );
  await User.updateOne({ _id: userId }, { $set: { name: data.name, onboardingCompleted: true } });
  if (!old) await WorkoutSplit.create({ userId, ...splitTemplates.starter, effective: today });
  if (!old || old.weight !== data.weight)
    await WeightHistory.findOneAndUpdate(
      { userId, date: today },
      { $set: { weight: data.weight } },
      { upsert: true, runValidators: true },
    );
  if (
    old &&
    (old.equipment !== data.equipment ||
      old.duration !== data.duration ||
      old.experience !== data.experience ||
      old.goal !== data.goal)
  ) {
    const plan = await WorkoutPlan.findOne({ userId, date: today });
    const logged = plan && (await WorkoutSetLog.exists({ userId, planId: plan._id }));
    if (plan && !logged && !plan.exercises.some((e: any) => e.completed))
      await WorkoutPlan.deleteOne({ _id: plan._id, userId });
  }
  res.json(await getState(userId));
});
trackingRouter.put('/settings', async (req, res) => {
  const data = z
    .object({
      theme: z.enum(['light', 'dark', 'system']).optional(),
      weightUnit: z.enum(['kg', 'lbs']).optional(),
      notifications: z.boolean().optional(),
      aiConsent: z.boolean().optional(),
      localAiEnabled: z.boolean().optional(),
    })
    .strict()
    .parse(req.body);
  res.json(
    await UserSettings.findOneAndUpdate(
      { userId: id(res) },
      { $set: data },
      { new: true, upsert: true, runValidators: true },
    ),
  );
});
trackingRouter.get('/export', async (_req, res) => {
  const output: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    user: publicUser(res.locals.user),
  };
  for (const model of privateModels) {
    if (['Session', 'ResetToken'].includes(model.modelName)) continue;
    output[model.modelName] = await model.find({ userId: id(res) }).lean();
  }
  res.json(output);
});
trackingRouter.post('/photo', upload.single('image'), async (req, res) => {
  const user = res.locals.user;
  const photo = await saveImage(await cleanImage(req.file), id(res));
  await removePhoto(user.photoUrl, user.photoPublicId);
  user.photoUrl = photo.url;
  user.photoPublicId = photo.publicId;
  await user.save();
  res.json({ user: publicUser(user) });
});
trackingRouter.delete('/photo', async (_req, res) => {
  const user = res.locals.user;
  await removePhoto(user.photoUrl, user.photoPublicId);
  user.photoUrl = '';
  user.photoPublicId = '';
  await user.save();
  res.json({ user: publicUser(user) });
});
trackingRouter.get('/images/:userId/:filename', async (req, res) => {
  if (req.params.userId !== id(res) || !/^[a-f0-9-]+\.webp$/.test(String(req.params.filename)))
    throw new HttpError(404, 'Image not found.');
  res.set('Cache-Control', 'private, max-age=3600');
  res.sendFile(resolve('.data/uploads', id(res), String(req.params.filename)), {
    dotfiles: 'allow',
  });
});
trackingRouter.post('/foods', async (req, res) => {
  const data = z
    .object({ items: z.array(foodSchema).min(1).max(20), requestId: z.string().uuid().optional() })
    .parse(req.body);
  for (const item of data.items) await validDate(id(res), item.date);
  // Image references can only be an owned upload, or a Cloudinary URL within this user's folder.
  for (const item of data.items)
    if (item.imageUrl && !ownedImage(item.imageUrl, id(res)))
      throw new HttpError(400, 'Invalid food image reference.');
  const requestId = data.requestId || crypto.randomUUID();
  const rows = [];
  for (const [i, item] of data.items.entries())
    rows.push(
      await FoodLog.findOneAndUpdate(
        { userId: id(res), requestId: `${requestId}:${i}` },
        { $setOnInsert: { ...item, userId: id(res) } },
        { upsert: true, new: true, runValidators: true },
      ),
    );
  res.status(201).json(rows);
});
function ownedImage(url: string, userId: string) {
  return (
    url.startsWith(`/api/images/${userId}/`) ||
    (url.startsWith(`https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`) &&
      url.includes(`/fittrack/${userId}/`))
  );
}
trackingRouter.put('/foods/:foodId', async (req, res) => {
  const data = foodSchema.parse(req.body);
  await validDate(id(res), data.date);
  if (data.imageUrl && !ownedImage(data.imageUrl, id(res)))
    throw new HttpError(400, 'Invalid food image reference.');
  const row = await FoodLog.findOneAndUpdate(
    { _id: req.params.foodId, userId: id(res) },
    { $set: data },
    { new: true, runValidators: true },
  );
  if (!row) throw new HttpError(404, 'Food entry not found.');
  res.json(row);
});
trackingRouter.delete('/foods/:foodId', async (req, res) => {
  const row = await FoodLog.findOneAndDelete({ _id: req.params.foodId, userId: id(res) });
  if (!row) throw new HttpError(404, 'Food entry not found.');
  res.json({ ok: true });
});
trackingRouter.post('/favorites', async (req, res) => {
  const data = foodSchema.parse(req.body);
  res.json(
    await FavoriteFood.findOneAndUpdate(
      { userId: id(res), name: data.name },
      { $set: { data } },
      { new: true, upsert: true },
    ),
  );
});
trackingRouter.delete('/favorites/:favoriteId', async (req, res) => {
  await FavoriteFood.deleteOne({ _id: req.params.favoriteId, userId: id(res) });
  res.json({ ok: true });
});
trackingRouter.post('/foods/analyze', aiLimit, upload.single('image'), async (req, res) => {
  await requireAi(id(res));
  const buffer = await cleanImage(req.file);
  const analysis = await analyzeFood(buffer);
  const image = analysis.items.length ? await saveImage(buffer, id(res)) : null;
  res.json({ ...analysis, imageUrl: image?.url || '' });
});
trackingRouter.put('/activity', async (req, res) => {
  const data = z
    .object({
      date: dateSchema,
      steps: z.number().int().min(0).max(150000),
      distance: z.number().min(0).max(200),
      minutes: z.number().int().min(0).max(1440),
      calories: z.number().min(0).max(15000),
    })
    .parse(req.body);
  await validDate(id(res), data.date);
  const existing = await ActivityLog.findOne({ userId: id(res), date: data.date });
  if (existing?.stepsSource === 'health_connect') data.steps = existing.steps;
  res.json(
    await ActivityLog.findOneAndUpdate(
      { userId: id(res), date: data.date },
      { $set: data },
      { new: true, upsert: true, runValidators: true },
    ),
  );
});
trackingRouter.put('/activity/health-connect', async (req, res) => {
  const data = z
    .object({
      date: dateSchema,
      steps: z.number().int().min(0).max(150000),
      hasData: z.boolean(),
      measuredAt: z.iso.datetime(),
    })
    .parse(req.body);
  const profile = await validDate(id(res), data.date);
  if (data.date < addDays(localDate(profile.timezone), -29))
    throw new HttpError(400, 'Health Connect sync is limited to the last 30 days.');
  const measured = new Date(data.measuredAt);
  if (measured.getTime() > Date.now() + 300000 || measured.getTime() < Date.now() - 86400000)
    throw new HttpError(400, 'Refresh Health Connect before syncing these steps.');
  const current = await ActivityLog.findOne({ userId: id(res), date: data.date });
  if (current?.stepsMeasuredAt && current.stepsMeasuredAt > measured) {
    res.json(current);
    return;
  }
  res.json(
    await ActivityLog.findOneAndUpdate(
      { userId: id(res), date: data.date },
      {
        $set: {
          steps: data.steps,
          stepsSource: 'health_connect',
          stepsMeasuredAt: measured,
          stepsSyncedAt: new Date(),
          stepsHasData: data.hasData,
        },
        $setOnInsert: { distance: 0, minutes: 0, calories: 0 },
      },
      { new: true, upsert: true, runValidators: true },
    ),
  );
});
trackingRouter.post('/water', async (req, res) => {
  const data = z
    .object({
      date: dateSchema,
      amount: z.number().int().min(1).max(2000),
      requestId: z.string().uuid(),
    })
    .parse(req.body);
  await validDate(id(res), data.date);
  res.json(
    await WaterLog.findOneAndUpdate(
      { userId: id(res), requestId: data.requestId },
      { $setOnInsert: { ...data, userId: id(res) } },
      { new: true, upsert: true, runValidators: true },
    ),
  );
});
trackingRouter.delete('/water/:waterId', async (req, res) => {
  await WaterLog.deleteOne({ _id: req.params.waterId, userId: id(res) });
  res.json({ ok: true });
});
trackingRouter.put('/weight', async (req, res) => {
  const data = z.object({ date: dateSchema, weight: z.number().min(30).max(350) }).parse(req.body);
  const profile = await validDate(id(res), data.date);
  await WeightHistory.findOneAndUpdate(
    { userId: id(res), date: data.date },
    { $set: { weight: data.weight } },
    { upsert: true, runValidators: true },
  );
  const latest = await WeightHistory.findOne({ userId: id(res) }).sort({ date: -1 });
  profile.weight = latest!.weight;
  const recommended = nutrition(profile as any);
  profile.bmr = recommended.bmr;
  profile.tdee = recommended.tdee;
  if (!profile.customTargets) profile.targets = recommended;
  await profile.save();
  res.json({ ok: true });
});
trackingRouter.post('/expenses', async (req, res) => {
  const data = z
    .object({
      date: dateSchema,
      description: z.string().trim().min(1).max(150),
      amount: z.number().positive().max(1000000),
      category: z.string().max(40),
      requestId: z.string().uuid().optional(),
    })
    .parse(req.body);
  await validDate(id(res), data.date);
  res
    .status(201)
    .json(
      await FoodExpense.findOneAndUpdate(
        { userId: id(res), requestId: data.requestId || crypto.randomUUID() },
        { $setOnInsert: { ...data, userId: id(res) } },
        { upsert: true, new: true, runValidators: true },
      ),
    );
});
trackingRouter.delete('/expenses/:expenseId', async (req, res) => {
  await FoodExpense.deleteOne({ _id: req.params.expenseId, userId: id(res) });
  res.json({ ok: true });
});
trackingRouter.put('/split', async (req, res) => {
  const data = splitSchema.parse(req.body),
    userId = id(res),
    profile = await getProfile(userId),
    today = localDate(profile.timezone);
  const plan = await WorkoutPlan.findOne({ userId, date: today });
  const locked =
    plan &&
    (plan.exercises.some((e: any) => e.completed) ||
      (await WorkoutSetLog.exists({ userId, planId: plan._id })));
  const effective = locked ? addDays(today, 1) : today;
  await WorkoutSplit.findOneAndUpdate(
    { userId, effective },
    { $set: data },
    { upsert: true, new: true, runValidators: true },
  );
  // Only untouched snapshots are replaceable. Historical snapshots are immutable.
  await WorkoutPlan.deleteMany({
    userId,
    date: { $gte: effective },
    'exercises.completed': { $ne: true },
  });
  res.json({
    effective,
    message: locked
      ? 'Schedule saved. It starts tomorrow because today already has performance records.'
      : 'Schedule saved. Today’s unstarted workout has been updated.',
  });
});
trackingRouter.put('/workouts/:planId/sets', async (req, res) => {
  const data = z
    .object({
      exerciseId: z.string().max(100),
      sets: z
        .array(
          z.object({
            setNumber: z.number().int().min(1).max(10),
            weight: z.number().min(0).max(1500),
            reps: z.number().int().min(0).max(200),
            unit: z.enum(['kg', 'lbs']),
            completed: z.boolean(),
          }),
        )
        .min(1)
        .max(10),
    })
    .parse(req.body);
  const plan = await WorkoutPlan.findOne({ _id: req.params.planId, userId: id(res) });
  if (!plan) throw new HttpError(404, 'Workout not found.');
  await validDate(id(res), plan.date);
  const exercise = plan.exercises.find((e: any) => e.id === data.exerciseId);
  if (!exercise) throw new HttpError(404, 'Exercise not found in this workout.');
  if (exercise.completed)
    throw new HttpError(409, 'Undo exercise completion before editing its sets.');
  if (
    new Set(data.sets.map((s) => s.setNumber)).size !== data.sets.length ||
    data.sets.some((s) => s.setNumber > exercise.sets)
  )
    throw new HttpError(400, 'Invalid or duplicate set number.');
  if (data.sets.some((s) => s.completed && s.reps < 1))
    throw new HttpError(400, 'Completed sets need at least one repetition.');
  await WorkoutSetLog.bulkWrite(
    data.sets.map((s) => ({
      updateOne: {
        filter: {
          userId: id(res),
          planId: plan._id,
          exerciseId: exercise.id,
          setNumber: s.setNumber,
        },
        update: {
          $set: {
            ...s,
            date: plan.date,
            targetReps: exercise.reps,
            completedAt: s.completed ? new Date() : null,
          },
        },
        upsert: true,
      },
    })),
  );
  await refreshPerformance(id(res), plan);
  res.json({ ok: true });
});
trackingRouter.put('/workouts/:planId/complete', async (req, res) => {
  const data = z.object({ exerciseId: z.string(), completed: z.boolean() }).parse(req.body);
  const plan = await WorkoutPlan.findOne({ _id: req.params.planId, userId: id(res) });
  if (!plan) throw new HttpError(404, 'Workout not found.');
  await validDate(id(res), plan.date);
  const exercise = plan.exercises.find((e: any) => e.id === data.exerciseId);
  if (!exercise || plan.rest)
    throw new HttpError(400, 'Choose an exercise from a scheduled workout.');
  if (
    data.completed &&
    !(await WorkoutSetLog.exists({
      userId: id(res),
      planId: plan._id,
      exerciseId: exercise.id,
      completed: true,
    }))
  )
    throw new HttpError(400, 'Save at least one completed set before confirming the exercise.');
  exercise.completed = data.completed;
  exercise.completedAt = data.completed ? exercise.completedAt || new Date().toISOString() : null;
  plan.markModified('exercises');
  await plan.save();
  await refreshPerformance(id(res), plan);
  res.json({ ok: true });
});
trackingRouter.put('/workouts/:planId/duration', async (req, res) => {
  const data = z.object({ duration: z.number().int().min(0).max(600) }).parse(req.body);
  const plan = await WorkoutPlan.findOneAndUpdate(
    { _id: req.params.planId, userId: id(res) },
    { $set: data },
    { new: true },
  );
  if (!plan) throw new HttpError(404, 'Workout not found.');
  await refreshPerformance(id(res), plan);
  res.json({ ok: true });
});
trackingRouter.get('/exercises/:exerciseId/history', async (req, res) => {
  const plans = await WorkoutPlan.find({
    userId: id(res),
    exercises: { $elemMatch: { id: req.params.exerciseId, completed: true } },
  }).select('_id');
  res.json(
    await WorkoutSetLog.find({
      userId: id(res),
      exerciseId: req.params.exerciseId,
      completed: true,
      planId: { $in: plans.map((p) => p._id) },
    })
      .sort({ date: -1, setNumber: 1 })
      .limit(600)
      .lean(),
  );
});
trackingRouter.post('/workouts/:planId/generate', aiLimit, async (req, res) => {
  await requireAi(id(res));
  const userId = id(res),
    profile = await getProfile(userId),
    plan = await WorkoutPlan.findOne({ _id: req.params.planId, userId });
  if (!plan || plan.rest) throw new HttpError(400, 'Select a training day.');
  if (plan.date !== localDate(profile.timezone))
    throw new HttpError(400, 'Only today’s unstarted routine can be regenerated.');
  if (await WorkoutSetLog.exists({ userId, planId: plan._id }))
    throw new HttpError(409, 'This workout has recorded sets. Its routine is preserved.');
  const previous = await WorkoutSetLog.find({ userId, completed: true })
    .sort({ date: -1 })
    .limit(30)
    .lean();
  plan.exercises = await generateWorkout(profile, plan.muscles, previous);
  plan.source = 'AI';
  await plan.save();
  res.json({ ok: true });
});
trackingRouter.post('/assistant', aiLimit, async (req, res) => {
  await requireAi(id(res));
  const { question } = z.object({ question: z.string().trim().min(1).max(1000) }).parse(req.body);
  const state = await getState(id(res));
  const recentFoodLogs = await FoodLog.find({
    userId: id(res),
    date: { $gte: addDays(state.today, -29) },
  }).lean();
  const recentSets = await WorkoutSetLog.find({ userId: id(res), completed: true })
    .sort({ date: -1 })
    .limit(100)
    .lean();
  res.json(
    await assistantAnswer(question, {
      today: state.today,
      profile: state.profile,
      totals: state.totals,
      foods: recentFoodLogs,
      workout: state.plan,
      records: state.records,
      sets: recentSets,
      weights: state.weights,
      streak: { current: state.streak.current, longest: state.streak.longest },
      budget: state.budget,
      reports: state.reports,
    }),
  );
});
