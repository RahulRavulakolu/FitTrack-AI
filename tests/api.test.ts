import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { createApp } from '../server/app';
import {
  FitnessProfile,
  FoodLog,
  WorkoutSetLog,
  Session,
  ResetToken,
  User,
  privateModels,
} from '../server/models';
import { addDays, localDate } from '../shared/domain';
import { hashToken } from '../server/middleware';
const app = createApp();
const a = request.agent(app),
  b = request.agent(app);
let mongo: MongoMemoryServer;
let state: any;
let foodId: string;
let photoUrl: string;
let owner: string;
const today = localDate('Asia/Kolkata');
const profile = {
  name: 'Journey Test',
  age: 30,
  gender: 'male',
  height: 175,
  weight: 70,
  activity: 'moderate',
  goal: 'bulking',
  budget: 300,
  budgetPeriod: 'daily',
  preference: 'vegetarian',
  allergies: 'peanuts',
  restrictions: '',
  dislikes: '',
  walking: '',
  experience: 'beginner',
  equipment: 'gym',
  duration: 45,
  recovery: '',
  timezone: 'Asia/Kolkata',
  customTargets: false,
};
const food = {
  name: 'Rice bowl',
  quantity: 1,
  unit: 'bowl',
  meal: 'Lunch',
  calories: 400,
  protein: 20,
  carbs: 60,
  fats: 9,
  fiber: 4,
  source: 'manual',
  imageUrl: '',
  date: today,
};
beforeAll(async () => {
  vi.stubEnv('LOCAL_AI_ENABLED', 'false');
  mongo = await MongoMemoryServer.create({
    binary:
      process.platform === 'win32'
        ? {
            systemBinary: resolve(
              'node_modules/.cache/mongodb-memory-server/mongod-x64-win32-7.0.24.exe',
            ),
          }
        : { version: '7.0.24' },
    instance: { dbName: 'fittrack-test' },
  });
  await mongoose.connect(mongo.getUri());
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
});
afterAll(async () => {
  vi.unstubAllEnvs();
  await mongoose.disconnect();
  await mongo?.stop();
});
describe('mobile sessions', () => {
  let token: string;
  let mobileUser: string;
  it('registers native accounts without cookies and stores only a token hash', async () => {
    const r = await request(app)
      .post('/api/auth/register')
      .set('Origin', 'capacitor://localhost')
      .set('X-FitTrack-Native', '1')
      .send({
        name: 'Mobile User',
        email: 'mobile@example.com',
        password: 'MobilePassword!123',
        confirmPassword: 'MobilePassword!123',
      });
    expect(r.status).toBe(201);
    token = r.headers['x-fittrack-session'];
    mobileUser = r.body.user.id;
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(r.headers['set-cookie']).toBeUndefined();
    const session = await Session.findOne({ userId: mobileUser });
    expect(session!.tokenHash).toBe(hashToken(token));
    expect(JSON.stringify(session)).not.toContain(token);
    const me = await request(app)
      .get('/api/auth/me')
      .set('X-FitTrack-Native', '1')
      .set('Authorization', `Bearer ${token}`);
    expect(me.body.user.id).toBe(mobileUser);
  });
  it('rejects cookie fallback, invalid origins and revoked mobile tokens', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'mobile@example.com', password: 'MobilePassword!123' });
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    expect(
      (await request(app).get('/api/auth/me').set('Cookie', cookie).set('X-FitTrack-Native', '1'))
        .status,
    ).toBe(401);
    expect(
      (
        await request(app)
          .put('/api/settings')
          .set('Authorization', `Bearer ${token}`)
          .set('Origin', 'https://malicious.example')
          .set('X-FitTrack-Native', '1')
          .send({ theme: 'light' })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .put('/api/settings')
          .set('Authorization', `Bearer ${token}`)
          .set('Origin', 'https://localhost')
          .set('X-FitTrack-Native', '1')
          .send({ theme: 'light' })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${token}`)
          .set('X-FitTrack-Native', '1')
          .send({})
      ).status,
    ).toBe(200);
    expect(
      (await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)).status,
    ).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Cookie', cookie)).status).toBe(200);
  });
  it('allows native preflight without enabling foreign origins', async () => {
    const r = await request(app)
      .options('/api/auth/login')
      .set('Origin', 'capacitor://localhost')
      .set('Access-Control-Request-Headers', 'content-type,x-fittrack-native');
    expect(r.status).toBe(204);
    expect(r.headers['access-control-allow-origin']).toBe('capacitor://localhost');
    expect(r.headers['access-control-expose-headers']).toContain('X-FitTrack-Session');
    const foreign = await request(app)
      .options('/api/auth/login')
      .set('Origin', 'https://malicious.example');
    expect(foreign.headers['access-control-allow-origin']).toBeUndefined();
  });
});
describe('complete API journey and isolation', () => {
  it('protects private endpoints, validates registration and hashes passwords', async () => {
    expect((await a.get('/api/state')).status).toBe(401);
    expect(
      (
        await a
          .post('/api/auth/register')
          .send({ name: 'J', email: 'bad', password: 'short', confirmPassword: 'short' })
      ).status,
    ).toBe(400);
    const r = await a.post('/api/auth/register').send({
      name: profile.name,
      email: 'journey@example.com',
      password: 'SecureJourney!123',
      confirmPassword: 'SecureJourney!123',
    });
    expect(r.status).toBe(201);
    owner = r.body.user.id;
    expect(r.body.user.onboardingCompleted).toBe(false);
    expect(r.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(r.headers['set-cookie'][0]).toContain('SameSite=Strict');
    const user = await User.findById(owner).select('+passwordHash');
    expect(user!.passwordHash).toMatch(/^\$2b\$/);
    expect(JSON.stringify(r.body)).not.toContain('passwordHash');
  });
  it('onboards once with saved goals and an initial plan', async () => {
    const r = await a.put('/api/profile').send(profile);
    expect(r.status).toBe(200);
    state = r.body;
    expect(state.user.onboardingCompleted).toBe(true);
    expect(state.profile.targets.calories).toBe(2806);
    expect(state.totals.calories).toBe(0);
    expect(state.weights).toHaveLength(1);
    expect((await a.put('/api/profile').send(profile)).body.splits).toHaveLength(1);
  });
  it('adds, edits and deletes food with immediate accurate daily totals', async () => {
    const r = await a.post('/api/foods').send({ items: [food] });
    expect(r.status).toBe(201);
    foodId = r.body[0]._id;
    expect((await a.get('/api/state')).body.totals.calories).toBe(400);
    expect((await a.put(`/api/foods/${foodId}`).send({ ...food, calories: 450 })).status).toBe(200);
    expect((await a.get('/api/state')).body.totals.calories).toBe(450);
    expect(
      (await a.post('/api/foods').send({ items: [{ ...food, date: addDays(today, 1) }] })).status,
    ).toBe(400);
    expect((await a.post('/api/foods').send({ items: [{ ...food, calories: -20 }] })).status).toBe(
      400,
    );
    await a.post('/api/favorites').send(food);
    expect((await a.get('/api/state')).body.favorites).toHaveLength(1);
  });
  it('rejects cross-site writes and isolates every user record', async () => {
    expect(
      (
        await a
          .put('/api/settings')
          .set('Origin', 'https://malicious.example')
          .send({ theme: 'light' })
      ).status,
    ).toBe(403);
    await b.post('/api/auth/register').send({
      name: 'Other User',
      email: 'other@example.com',
      password: 'OtherPassword!123',
      confirmPassword: 'OtherPassword!123',
    });
    await b.put('/api/profile').send({ ...profile, name: 'Other User' });
    expect((await b.get('/api/state')).body.foods).toHaveLength(0);
    expect((await b.put(`/api/foods/${foodId}`).send(food)).status).toBe(404);
    expect((await b.delete(`/api/foods/${foodId}`).send({})).status).toBe(404);
  });
  it('saves a custom split and persists individual sets across refresh', async () => {
    const split = {
      name: 'Test training',
      days: Array.from({ length: 7 }, () => ({ rest: false, muscles: ['Chest'] })),
    };
    expect((await a.put('/api/split').send(split)).status).toBe(200);
    state = (await a.get('/api/state')).body;
    const plan = state.plan;
    expect(plan.exercises.length).toBeGreaterThan(0);
    expect(
      (
        await a
          .put(`/api/workouts/${plan._id}/complete`)
          .send({ exerciseId: plan.exercises[0].id, completed: true })
      ).status,
    ).toBe(400);
    const sets = [
      { setNumber: 1, weight: 40, reps: 12, unit: 'kg', completed: true },
      { setNumber: 2, weight: 45, reps: 10, unit: 'kg', completed: true },
    ];
    expect(
      (
        await a
          .put(`/api/workouts/${plan._id}/sets`)
          .send({ exerciseId: plan.exercises[0].id, sets })
      ).status,
    ).toBe(200);
    state = (await a.get('/api/state')).body;
    expect(state.setLogs).toHaveLength(2);
    expect(state.records).toHaveLength(0);
    expect(state.streak.current).toBe(0);
    expect(
      (
        await b
          .put(`/api/workouts/${plan._id}/sets`)
          .send({ exerciseId: plan.exercises[0].id, sets })
      ).status,
    ).toBe(404);
  });
  it('requires explicit completion and counts one streak day with correct PRs', async () => {
    const path = `/api/workouts/${state.plan._id}/complete`;
    const data = { exerciseId: state.plan.exercises[0].id, completed: true };
    expect((await a.put(path).send(data)).status).toBe(200);
    expect((await a.put(path).send(data)).status).toBe(200);
    state = (await a.get('/api/state')).body;
    expect(state.streak.current).toBe(1);
    expect(state.streak.total).toBe(1);
    expect(state.records[0].weight).toBe(45);
    expect(state.records[0].oneRepMax).toBeCloseTo(60);
    expect(state.histories[0].volume).toBe(930);
    expect(await WorkoutSetLog.countDocuments({ userId: owner })).toBe(2);
  });
  it('preserves historical performance on split changes and supports completion undo', async () => {
    const oldId = state.plan._id;
    const r = await a.put('/api/split').send({
      name: 'Recovery week',
      days: Array.from({ length: 7 }, () => ({ rest: true, muscles: [] })),
    });
    expect(r.body.effective).toBe(addDays(today, 1));
    state = (await a.get('/api/state')).body;
    expect(state.plan._id).toBe(oldId);
    expect(state.plan.exercises[0].completed).toBe(true);
    await a
      .put(`/api/workouts/${oldId}/complete`)
      .send({ exerciseId: state.plan.exercises[0].id, completed: false });
    state = (await a.get('/api/state')).body;
    expect(state.streak.current).toBe(0);
    expect(state.streak.longest).toBe(1);
    expect(state.records).toHaveLength(0);
    await a
      .put(`/api/workouts/${oldId}/complete`)
      .send({ exerciseId: state.plan.exercises[0].id, completed: true });
  });
  it('tracks water idempotently, activity, expenses and custom targets without silent overwrites', async () => {
    const water = { date: today, amount: 500, requestId: crypto.randomUUID() };
    await a.post('/api/water').send(water);
    await a.post('/api/water').send(water);
    await a
      .put('/api/activity')
      .send({ date: today, steps: 5000, distance: 3.4, minutes: 35, calories: 200 });
    await a
      .post('/api/expenses')
      .send({ date: today, description: 'Groceries', amount: 120, category: 'Groceries' });
    const targets = { calories: 2200, protein: 140, carbs: 250, fats: 65, water: 2700 };
    await a.put('/api/profile').send({ ...profile, customTargets: true, targets });
    await a.put('/api/weight').send({ date: today, weight: 72 });
    state = (await a.get('/api/state')).body;
    expect(state.water).toBe(500);
    expect(state.activity.steps).toBe(5000);
    expect(state.budget.remaining).toBe(180);
    expect(state.profile.weight).toBe(72);
    expect(state.profile.targets).toEqual(targets);
    expect((await a.put('/api/profile').send(profile)).status).toBe(400);
  });
  it('replaces Health Connect totals idempotently, preserves other activity and rejects stale snapshots', async () => {
    const snapshot = {
      date: today,
      steps: 6200,
      hasData: true,
      measuredAt: new Date(Date.now() - 1000).toISOString(),
    };
    const first = await a.put('/api/activity/health-connect').send(snapshot);
    expect(first.status).toBe(200);
    const repeated = await a.put('/api/activity/health-connect').send(snapshot);
    expect(repeated.body.steps).toBe(6200);
    expect(repeated.body.distance).toBe(3.4);
    expect(repeated.body.minutes).toBe(35);
    expect(repeated.body.calories).toBe(200);
    expect(repeated.body.stepsSource).toBe('health_connect');
    expect((await b.get('/api/state')).body.activity?.steps || 0).toBe(0);
    const stale = await a
      .put('/api/activity/health-connect')
      .send({ ...snapshot, steps: 100, measuredAt: new Date(Date.now() - 60000).toISOString() });
    expect(stale.body.steps).toBe(6200);
    const correction = await a
      .put('/api/activity/health-connect')
      .send({ ...snapshot, steps: 6100, measuredAt: new Date().toISOString() });
    expect(correction.body.steps).toBe(6100);
    const manual = await a
      .put('/api/activity')
      .send({ date: today, steps: 123, distance: 4, minutes: 40, calories: 210 });
    expect(manual.body.steps).toBe(6100);
    expect(manual.body.distance).toBe(4);
    expect(
      (await a.put('/api/activity/health-connect').send({ ...snapshot, steps: -1 })).status,
    ).toBe(400);
    expect(
      (await a.put('/api/activity/health-connect').send({ ...snapshot, date: addDays(today, 1) }))
        .status,
    ).toBe(400);
  });
  it('validates photos and keeps each user’s images private locally', async () => {
    expect(
      (
        await a.post('/api/photo').attach('image', Buffer.from('not an image'), {
          filename: 'bad.jpg',
          contentType: 'image/jpeg',
        })
      ).status,
    ).toBe(400);
    const buffer = await sharp({
      create: { width: 32, height: 32, channels: 3, background: '#abcd89' },
    })
      .jpeg()
      .toBuffer();
    const r = await a
      .post('/api/photo')
      .attach('image', buffer, { filename: 'avatar.jpg', contentType: 'image/jpeg' });
    expect(r.status).toBe(200);
    photoUrl = r.body.user.photoUrl;
    expect((await a.get(photoUrl)).status).toBe(200);
    expect((await b.get(photoUrl)).status).toBe(404);
    await a.delete('/api/photo').send({});
    expect((await a.get('/api/auth/me')).body.user.photoUrl).toBe('');
  });
  it('persists theme, records and onboarding state across logout and login', async () => {
    await a.put('/api/settings').send({ theme: 'light', weightUnit: 'lbs' });
    expect((await a.post('/api/auth/logout').send({})).status).toBe(200);
    expect((await a.get('/api/state')).status).toBe(401);
    const r = await a
      .post('/api/auth/login')
      .send({ email: 'journey@example.com', password: 'SecureJourney!123' });
    expect(r.body.user.onboardingCompleted).toBe(true);
    state = (await a.get('/api/state')).body;
    expect(state.settings.theme).toBe('light');
    expect(state.setLogs).toHaveLength(2);
    expect(state.foods).toHaveLength(1);
    expect(state.profile.targets.calories).toBe(2200);
  });
  it('fails honestly when local AI is disabled and exports no session secrets', async () => {
    expect((await a.post('/api/assistant').send({ question: 'How many calories?' })).status).toBe(
      503,
    );
    const r = await a.get('/api/export');
    expect(r.status).toBe(200);
    expect(r.body.FoodLog).toHaveLength(1);
    expect(r.body.Session).toBeUndefined();
    expect(JSON.stringify(r.body)).not.toContain('passwordHash');
  });
  it('deduplicates retries of food and expense submissions', async () => {
    const batch = { items: [{ ...food, name: 'Retry test meal' }], requestId: crypto.randomUUID() };
    const first = await a.post('/api/foods').send(batch);
    const retry = await a.post('/api/foods').send(batch);
    expect(first.status).toBe(201);
    expect(retry.body[0]._id).toBe(first.body[0]._id);
    expect(await FoodLog.countDocuments({ userId: owner, name: 'Retry test meal' })).toBe(1);
    await a.delete(`/api/foods/${first.body[0]._id}`).send({});
    const expense = {
      date: today,
      description: 'Retry test expense',
      amount: 20,
      category: 'Other',
      requestId: crypto.randomUUID(),
    };
    const paid = await a.post('/api/expenses').send(expense);
    const repeated = await a.post('/api/expenses').send(expense);
    expect(repeated.body._id).toBe(paid.body._id);
    await a.delete(`/api/expenses/${paid.body._id}`).send({});
  });
  it('consumes reset tokens once and revokes all sessions', async () => {
    const token = 'a'.repeat(64);
    await ResetToken.create({
      userId: owner,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60000),
    });
    const data = { token, password: 'NewPassword!123', confirmPassword: 'NewPassword!123' };
    expect((await a.post('/api/auth/reset').send(data)).status).toBe(200);
    expect((await a.post('/api/auth/reset').send(data)).status).toBe(400);
    expect(await Session.countDocuments({ userId: owner })).toBe(0);
    expect(
      (
        await a
          .post('/api/auth/login')
          .send({ email: 'journey@example.com', password: 'SecureJourney!123' })
      ).status,
    ).toBe(401);
    expect(
      (
        await a
          .post('/api/auth/login')
          .send({ email: 'journey@example.com', password: 'NewPassword!123' })
      ).status,
    ).toBe(200);
  });
  it('deletes account data while leaving other accounts intact', async () => {
    expect(
      (
        await a
          .delete('/api/auth/account')
          .send({ password: 'NewPassword!123', confirmation: 'DELETE' })
      ).status,
    ).toBe(200);
    expect(await User.findById(owner)).toBeNull();
    for (const model of privateModels)
      expect(await model.countDocuments({ userId: owner })).toBe(0);
    expect((await b.get('/api/state')).status).toBe(200);
  });
});
