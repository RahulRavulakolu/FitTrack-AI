import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { User, Session, ResetToken, UserSettings, privateModels } from '../models.js';
import { auth, hashToken, HttpError } from '../middleware.js';
import { sendReset } from '../services/email.js';
import { deleteUserImages } from '../services/images.js';
export const authRouter = Router();
authRouter.use((req, res, next) => {
  res.locals.nativeClient = req.get('X-FitTrack-Native') === '1';
  next();
});
const email = z.string().trim().toLowerCase().email().max(254);
export const password = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(72, 'Use at most 72 characters')
  .refine((x) => Buffer.byteLength(x, 'utf8') <= 72, 'Password must fit within 72 UTF-8 bytes');
const credentials = z.object({ email, password: z.string().min(1).max(1000) });
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in 15 minutes.' },
});
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
});
async function createSession(userId: string, res: any) {
  const token = crypto.randomBytes(32).toString('hex');
  await Session.create({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 30 * 86400000),
  });
  if (res.locals.nativeClient) res.set('X-FitTrack-Session', token);
  else res.cookie('fittrack_session', token, { ...cookieOptions(), maxAge: 30 * 86400000 });
}
export function publicUser(user: any) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    photoUrl: user.photoUrl,
    onboardingCompleted: user.onboardingCompleted,
  };
}
authRouter.post('/register', loginLimit, async (req, res) => {
  const data = z
    .object({
      name: z.string().trim().min(2).max(80),
      email,
      password,
      confirmPassword: z.string(),
    })
    .refine((x) => x.password === x.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    })
    .parse(req.body);
  if (await User.exists({ email: data.email }))
    throw new HttpError(
      409,
      'An account with that email already exists. Sign in or reset your password.',
    );
  const user = await User.create({
    name: data.name,
    email: data.email,
    passwordHash: await bcrypt.hash(data.password, 12),
  });
  await UserSettings.create({ userId: user._id });
  await createSession(String(user._id), res);
  res.status(201).json({ user: publicUser(user) });
});
const dummyHash = bcrypt.hashSync('constant-time-dummy-password', 12);
authRouter.post('/login', loginLimit, async (req, res) => {
  const data = credentials.parse(req.body);
  const user = await User.findOne({ email: data.email }).select('+passwordHash');
  const valid = await bcrypt.compare(data.password, user?.passwordHash || dummyHash);
  if (!valid || !user) throw new HttpError(401, 'Email or password is incorrect.');
  await createSession(String(user._id), res);
  res.json({ user: publicUser(user) });
});
authRouter.get('/me', auth, async (_req, res) =>
  res.json({
    user: publicUser(res.locals.user),
    settings: await UserSettings.findOne({ userId: res.locals.user._id }),
  }),
);
authRouter.post('/logout', auth, async (_req, res) => {
  await Session.deleteOne({ _id: res.locals.session._id });
  res.clearCookie('fittrack_session', cookieOptions());
  res.json({ ok: true });
});
authRouter.post('/forgot', loginLimit, async (req, res) => {
  const data = z.object({ email }).parse(req.body);
  const user = await User.findOne({ email: data.email });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    await ResetToken.deleteMany({ userId: user._id });
    await ResetToken.create({
      userId: user._id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 30 * 60000),
    });
    await sendReset(user.email, token, res.locals.nativeClient);
  }
  res.json({
    message:
      'If that email is registered, a password reset link has been sent. It expires in 30 minutes.',
  });
});
authRouter.post('/reset', loginLimit, async (req, res) => {
  const data = z
    .object({ token: z.string().length(64), password, confirmPassword: z.string() })
    .refine((x) => x.password === x.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    })
    .parse(req.body);
  const token = await ResetToken.findOneAndDelete({
    tokenHash: hashToken(data.token),
    expiresAt: { $gt: new Date() },
  });
  if (!token) throw new HttpError(400, 'This reset link is invalid or has expired.');
  await User.updateOne(
    { _id: token.userId },
    { $set: { passwordHash: await bcrypt.hash(data.password, 12) } },
  );
  await Session.deleteMany({ userId: token.userId });
  res.clearCookie('fittrack_session', cookieOptions());
  res.json({ ok: true });
});
authRouter.post('/password', auth, loginLimit, async (req, res) => {
  const data = z.object({ currentPassword: z.string(), password }).parse(req.body);
  const user = await User.findById(res.locals.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(data.currentPassword, user!.passwordHash)))
    throw new HttpError(400, 'Current password is incorrect.');
  user!.passwordHash = await bcrypt.hash(data.password, 12);
  await user!.save();
  await Session.deleteMany({ userId: user!._id });
  await createSession(String(user!._id), res);
  res.json({ ok: true });
});
authRouter.delete('/account', auth, loginLimit, async (req, res) => {
  const data = z
    .object({ password: z.string(), confirmation: z.literal('DELETE') })
    .parse(req.body);
  const user = await User.findById(res.locals.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(data.password, user!.passwordHash)))
    throw new HttpError(400, 'Password is incorrect.');
  await deleteUserImages(String(user!._id));
  for (const model of privateModels) await model.deleteMany({ userId: user!._id });
  await User.deleteOne({ _id: user!._id });
  res.clearCookie('fittrack_session', cookieOptions());
  res.json({ ok: true });
});
