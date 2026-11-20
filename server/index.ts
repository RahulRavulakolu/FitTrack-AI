import 'dotenv/config';
import { connectDatabase, closeDatabase } from './db.js';
import { createApp } from './app.js';
if (process.env.NODE_ENV === 'production') {
  if (!process.env.APP_ORIGIN?.startsWith('https://'))
    throw new Error('Production requires an HTTPS APP_ORIGIN.');
  if (!process.env.SMTP_HOST) throw new Error('Production requires SMTP_HOST for password resets.');
}
await connectDatabase();
const server = createApp().listen(Number(process.env.PORT || 4000), () =>
  console.log(`FitTrack API listening on port ${process.env.PORT || 4000}`),
);
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await closeDatabase();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
