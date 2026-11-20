import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { ZodError } from 'zod';
import { Session, User } from './models.js';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
export async function auth(req: Request, res: Response, next: NextFunction) {
  const bearer = req.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  const token =
    bearer || (req.get('X-FitTrack-Native') === '1' ? undefined : req.cookies?.fittrack_session);
  if (!token || typeof token !== 'string') throw new HttpError(401, 'Please sign in to continue.');
  const session = await Session.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  });
  const user = session && (await User.findById(session.userId));
  if (!user) throw new HttpError(401, 'Your session has expired. Please sign in again.');
  res.locals.user = user;
  res.locals.session = session;
  next();
}
export function sameOrigin(req: Request, res: Response, next: NextFunction) {
  const origin = req.get('origin');
  const nativeOrigin =
    !!origin && ['capacitor://localhost', 'https://localhost', 'http://localhost'].includes(origin);
  const nativeRequest = nativeOrigin && req.get('X-FitTrack-Native') === '1';
  if (nativeOrigin) {
    res.set('Access-Control-Allow-Origin', origin!);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-FitTrack-Native');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Expose-Headers', 'X-FitTrack-Session');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.get('origin');
    const expected = process.env.APP_ORIGIN || 'http://localhost:5173';
    if (origin && origin !== expected && !nativeRequest)
      throw new HttpError(403, 'This request origin is not allowed.');
    if (req.get('sec-fetch-site') === 'cross-site' && !nativeRequest)
      throw new HttpError(403, 'Cross-site requests are not allowed.');
    if (!req.is('application/json') && !req.is('multipart/form-data'))
      throw new HttpError(415, 'Send JSON or a supported image upload.');
  }
  next();
}
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError)
    return res
      .status(400)
      .json({ error: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
  if (err.code === 11000)
    return res
      .status(409)
      .json({ error: 'This record already exists. Please refresh and try again.' });
  if (err.name === 'CastError')
    return res.status(400).json({ error: 'Invalid record identifier.' });
  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(413).json({ error: 'Please choose an image smaller than 5 MB.' });
  const status = err.status || 500;
  if (status >= 500) console.error(err.message);
  res
    .status(status)
    .json({ error: status === 500 ? 'Something went wrong. Please try again.' : err.message });
}
