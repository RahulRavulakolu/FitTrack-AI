import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { resolve } from 'node:path';
import mongoose from 'mongoose';
import { authRouter } from './routes/auth.js';
import { trackingRouter } from './routes/tracking.js';
import { sameOrigin, errorHandler } from './middleware.js';
export function createApp() {
  const app = express();
  if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com', 'https://wger.de'],
          connectSrc: ["'self'"],
          mediaSrc: ["'self'", 'blob:', 'https://wger.de'],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '256kb' }));
  app.use('/api', sameOrigin);
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.get('/api/health', (_req, res) =>
    res
      .status(mongoose.connection.readyState === 1 ? 200 : 503)
      .json({ status: mongoose.connection.readyState === 1 ? 'ok' : 'database unavailable' }),
  );
  app.use('/api/auth', authRouter);
  app.use('/api', trackingRouter);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(resolve('dist/client')));
    app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/client/index.html')));
  }
  app.use(errorHandler);
  return app;
}
