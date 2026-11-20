import mongoose, { Schema } from 'mongoose';
const owner = { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true };
const text = { type: String, required: true };
const nonnegative = { type: Number, min: 0, default: 0 };
function model(
  name: string,
  fields: Record<string, unknown>,
  indexes: [Record<string, 1 | -1>, Record<string, unknown>?][] = [],
) {
  const schema = new Schema(fields as any, { timestamps: true });
  for (const [keys, options] of indexes) schema.index(keys, options);
  return mongoose.model<any>(name, schema);
}
export const User = model('User', {
  name: text,
  email: { ...text, unique: true, lowercase: true },
  passwordHash: { ...text, select: false },
  photoUrl: { type: String, default: '' },
  photoPublicId: String,
  onboardingCompleted: { type: Boolean, default: false },
  longestStreak: { type: Number, default: 0 },
});
export const Session = model(
  'Session',
  {
    userId: owner,
    tokenHash: { ...text, unique: true },
    expiresAt: { type: Date, required: true },
  },
  [[{ expiresAt: 1 }, { expireAfterSeconds: 0 }]],
);
export const ResetToken = model(
  'ResetToken',
  {
    userId: owner,
    tokenHash: { ...text, unique: true },
    expiresAt: { type: Date, required: true },
  },
  [[{ expiresAt: 1 }, { expireAfterSeconds: 0 }]],
);
export const FitnessProfile = model('FitnessProfile', {
  userId: { ...owner, unique: true },
  age: Number,
  gender: String,
  height: Number,
  weight: Number,
  activity: String,
  goal: String,
  budget: Number,
  budgetPeriod: String,
  preference: String,
  allergies: String,
  restrictions: String,
  dislikes: String,
  walking: String,
  experience: String,
  equipment: String,
  duration: Number,
  recovery: String,
  timezone: String,
  customTargets: Boolean,
  targets: Schema.Types.Mixed,
  bmr: Number,
  tdee: Number,
  startDate: String,
});
export const UserSettings = model('UserSettings', {
  userId: { ...owner, unique: true },
  theme: { type: String, enum: ['light', 'dark', 'system'], default: 'dark' },
  weightUnit: { type: String, enum: ['kg', 'lbs'], default: 'kg' },
  notifications: { type: Boolean, default: false },
  aiConsent: { type: Boolean, default: false },
  localAiEnabled: { type: Boolean, default: true },
});
export const FoodLog = model(
  'FoodLog',
  {
    userId: owner,
    requestId: String,
    name: text,
    quantity: { type: Number, min: 0.01, required: true },
    unit: text,
    meal: text,
    calories: nonnegative,
    protein: nonnegative,
    carbs: nonnegative,
    fats: nonnegative,
    fiber: nonnegative,
    source: { type: String, enum: ['manual', 'AI'], default: 'manual' },
    imageUrl: String,
    date: text,
  },
  [
    [{ userId: 1, date: 1 }],
    [
      { userId: 1, requestId: 1 },
      { unique: true, partialFilterExpression: { requestId: { $type: 'string' } } },
    ],
  ],
);
export const FavoriteFood = model(
  'FavoriteFood',
  { userId: owner, name: text, data: { type: Schema.Types.Mixed, required: true } },
  [[{ userId: 1, name: 1 }, { unique: true }]],
);
export const WorkoutSplit = model(
  'WorkoutSplit',
  {
    userId: owner,
    name: text,
    effective: text,
    days: { type: [{ rest: Boolean, muscles: [String] }], required: true },
  },
  [[{ userId: 1, effective: 1 }, { unique: true }]],
);
export const ExerciseModel = model('Exercise', {
  id: { ...text, unique: true },
  name: text,
  muscle: text,
  equipment: text,
  instructions: text,
  mediaSlug: String,
  imageUrl: String,
  images: [String],
  videoUrl: String,
  attribution: String,
  sourceUrl: String,
});
export const WorkoutPlan = model(
  'WorkoutPlan',
  {
    userId: owner,
    date: text,
    splitName: String,
    muscles: [String],
    rest: Boolean,
    source: { type: String, default: 'catalog' },
    exercises: { type: [Schema.Types.Mixed], default: [] },
    duration: nonnegative,
  },
  [[{ userId: 1, date: 1 }, { unique: true }]],
);
export const WorkoutSetLog = model(
  'WorkoutSetLog',
  {
    userId: owner,
    planId: { type: Schema.Types.ObjectId, ref: 'WorkoutPlan', required: true },
    exerciseId: text,
    date: text,
    setNumber: { type: Number, min: 1, max: 10, required: true },
    targetReps: String,
    weight: nonnegative,
    reps: { type: Number, min: 0, max: 200, default: 0 },
    unit: { type: String, enum: ['kg', 'lbs'], default: 'kg' },
    completed: { type: Boolean, default: false },
    completedAt: Date,
  },
  [
    [{ userId: 1, planId: 1, exerciseId: 1, setNumber: 1 }, { unique: true }],
    [{ userId: 1, exerciseId: 1, date: -1 }],
  ],
);
export const WorkoutHistory = model(
  'WorkoutHistory',
  {
    userId: owner,
    date: text,
    planId: Schema.Types.ObjectId,
    completedExercises: [String],
    muscles: [String],
    duration: Number,
    percentage: Number,
    volume: Number,
    sets: Number,
  },
  [[{ userId: 1, date: 1 }, { unique: true }]],
);
export const PersonalRecord = model(
  'PersonalRecord',
  {
    userId: owner,
    exerciseId: text,
    name: text,
    weight: Number,
    reps: Number,
    oneRepMax: Number,
    achievedAt: String,
  },
  [[{ userId: 1, exerciseId: 1 }, { unique: true }]],
);
export const ActivityLog = model(
  'ActivityLog',
  {
    userId: owner,
    date: text,
    steps: nonnegative,
    stepsSource: { type: String, enum: ['manual', 'health_connect'], default: 'manual' },
    stepsMeasuredAt: Date,
    stepsSyncedAt: Date,
    stepsHasData: Boolean,
    distance: nonnegative,
    minutes: nonnegative,
    calories: nonnegative,
  },
  [[{ userId: 1, date: 1 }, { unique: true }]],
);
export const WaterLog = model(
  'WaterLog',
  {
    userId: owner,
    date: text,
    amount: { type: Number, min: 1, max: 2000, required: true },
    requestId: text,
  },
  [[{ userId: 1, requestId: 1 }, { unique: true }], [{ userId: 1, date: 1 }]],
);
export const StreakHistory = model(
  'StreakHistory',
  { userId: owner, date: text, status: String, streak: Number, frozen: Boolean },
  [[{ userId: 1, date: 1 }, { unique: true }]],
);
export const WeightHistory = model(
  'WeightHistory',
  { userId: owner, date: text, weight: { type: Number, min: 30, max: 350, required: true } },
  [[{ userId: 1, date: 1 }, { unique: true }]],
);
export const FoodExpense = model(
  'FoodExpense',
  {
    userId: owner,
    requestId: String,
    date: text,
    description: text,
    amount: { type: Number, min: 0.01, max: 1000000, required: true },
    category: String,
  },
  [
    [{ userId: 1, date: 1 }],
    [
      { userId: 1, requestId: 1 },
      { unique: true, partialFilterExpression: { requestId: { $type: 'string' } } },
    ],
  ],
);
export const privateModels = [
  Session,
  ResetToken,
  FitnessProfile,
  UserSettings,
  FoodLog,
  FavoriteFood,
  WorkoutSplit,
  WorkoutPlan,
  WorkoutSetLog,
  WorkoutHistory,
  PersonalRecord,
  ActivityLog,
  WaterLog,
  StreakHistory,
  WeightHistory,
  FoodExpense,
];
