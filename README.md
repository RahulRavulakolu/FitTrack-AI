# FitTrack AI

A fitness application for **Android and iPhone**, with Capacitor native projects, a React/TypeScript interface bundled inside each app, an Express API and MongoDB persistence. Four main destinations: Home, Nutrition, Workouts and Profile. Native features include camera/gallery access, Android Keystore/iOS Keychain session storage, back-button handling and the system share sheet for data exports.

See **[MOBILE.md](docs/MOBILE.md)** for Android installation, the Windows server launcher, iPhone build/signing and native verification. Android builds produce `releases/FitTrack-AI-Android.apk`. iOS compilation requires macOS and Xcode; no signed iPhone IPA is produced on this Windows computer. The browser is also available for development and desktop access.

## Start locally

Requires Node.js 24 or later (verified on Node 26), npm, and internet access for the first dependency/MongoDB download.

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Open **http://localhost:5173**. Create your own account and complete onboarding. No demo account or fabricated activity is seeded. The exercise catalog contains reusable exercise definitions, not user workout history.

The API runs on port 4000. When `MONGODB_URI` is empty in development, a **real MongoDB 7.0 process** starts with WiredTiger data files in `.data/mongo`. Despite its package name, `mongodb-memory-server` is used as a process launcher with persistent on-disk storage. Stop with Ctrl+C. Never run two development servers against the same data directory. You can instead supply an existing MongoDB URI.

Development photos are private files in `.data/uploads`, served only to their signed-in owner. Development password-reset emails are saved to `.data/mail/*.txt`; open the latest file to follow its reset link. These folders are excluded from Git, Docker, and public static serving. Production uses Cloudinary and SMTP.

## What works

- Registration, login, password reset, password changes, logout, session revocation and account deletion. Passwords use bcrypt; random session/reset tokens are hashed in MongoDB.
- Six-step onboarding with activity, goals, budgets, food preferences, equipment, experience, recovery notes and optional cropped profile photo.
- Mifflin–St Jeor BMR/TDEE estimates, adjustable nutrition and water targets, and explicit confirmation before replacing manually customized targets.
- Manual food logging, editable/deletable entries, meal categories, favorites, date navigation, immediate totals and weekly reports.
- Camera/webcam capture, upload and preview, AI vision analysis, editable portion/nutrition confirmation, and explicit estimate labeling. AI never saves food automatically.
- Versioned single-muscle, double-muscle, PPL and custom weekly schedules. Rest and muscle selections are mutually exclusive. A balanced three-day schedule is the default.
- Persisted equipment-aware routines, separate per-set weight/repetition records, kg/lbs conversion, rest timer, exercise completion/undo, history, volume, personal records and conservative progression suggestions.
- Timezone-aware daily streaks, rest-day preservation, one missed training-day freeze, reset on the second consecutive scheduled miss, unique daily history and preserved longest-ever streak.
- Activity totals, water quick adds/undo, food expenses/budget comparison, weight charts and weekly/monthly progress.
- Profile photos with crop, zoom and position controls; light/dark/system themes; food/workout settings; in-app daily reminders; AI privacy opt-in and data export.
- Optional AI routine generation and fitness assistant grounded in the authenticated user's saved data.

## Connect external services

Copy `.env.example` to `.env` and set values **on the server only**. Never prefix secrets with `VITE_` or commit `.env`.

| Service                                    | Recommended setup                                   | Required variables                                                     |
| ------------------------------------------ | --------------------------------------------------- | ---------------------------------------------------------------------- |
| Database                                   | MongoDB Atlas, dedicated database user and database | `MONGODB_URI`                                                          |
| Food vision, routine generation, assistant | Free local Ollama + Qwen3-VL on the server computer | `OLLAMA_URL`, `OLLAMA_VISION_MODEL`, `OLLAMA_TEXT_MODEL`; no API key   |
| Hosted profile/food photos                 | Cloudinary cloud                                    | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| Password-reset email                       | SMTP provider such as Brevo, Postmark or SES        | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`        |
| Web host                                   | Render or any Node/Docker host with HTTPS           | `APP_ORIGIN`, `NODE_ENV=production`, optionally `TRUST_PROXY=1`        |

Restart the server after changing environment variables. Run **Setup-Free-AI.cmd** once to download Ollama and the free `qwen3-vl:2b-instruct` model on this computer. **Start-FitTrack-Server.cmd** then starts the local model service and backend. No LLM is downloaded to the phone. The server only accepts a loopback Ollama address and rejects cloud-model names; the launcher disables Ollama cloud features. **Profile → Privacy & AI → Enable local AI** controls inference. See [LOCAL_AI.md](docs/LOCAL_AI.md). Responses are validated before display, and food estimates still require your review. The assistant does not write records.

Cloudinary photos use public asset URLs. The UI explains this in privacy settings. Account deletion removes hosted assets under the user's folder before removing database records. Local development uploads require authentication.

## Validation

```powershell
npm run typecheck
npm test
npm run build
npm audit
```

`npm test` starts an isolated, temporary MongoDB database; it never clears your development database. On Windows it uses the MongoDB binary downloaded under `node_modules/.cache/mongodb-memory-server`. Other platforms automatically use the normal downloader.

With `npm run dev` running, execute:

```powershell
npm run test:e2e
```

The browser suite uses installed Microsoft Edge by default and creates/deletes its own account through the UI. For another environment, set `PLAYWRIGHT_CHANNEL=chrome`, or `PLAYWRIGHT_CHANNEL=chromium` and run `npx playwright install chromium` first. The suite covers registration → onboarding → food create/edit → custom split → actual sets → explicit completion/PR → water/activity → photo crop → theme → logout/login → mobile views → account deletion. Screenshots and failure traces are in `test-results` and the HTML report in `playwright-report`. Failed runs can leave accounts whose email begins `browser-` and ends `@fittrack.invalid`; these are test records, never shown to other users.

AI response contracts are tested with mocked local-model responses. Actual local inference is checked separately after installing Ollama; Cloudinary, SMTP delivery and physical-device Health Connect/camera behavior require their services/devices. Media links are source-dependent; 17 catalog exercises include matched real wger media. Entries without a verified match show written instructions/source guides rather than invented demonstrations. See [EXERCISE_MEDIA.md](docs/EXERCISE_MEDIA.md) for original media authors, licenses and links.

## Deploy

For this project's Azure for Students credit and custom domain, use **[AZURE.md](docs/AZURE.md)** and `deploy/azure/`. That package runs the free model alongside the API and keeps photos on a private persistent volume. It is prepared for review; no cloud service is live yet.

This repository includes a multi-stage `Dockerfile`, `.dockerignore` and a Render blueprint. Nothing has been published to a hosting account automatically.

1. Put the repository in your own Git hosting account.
2. Create MongoDB Atlas and obtain a restricted database user's URI. Configure backups and allow connections from your host.
3. Configure Cloudinary and SMTP sender verification. For AI, run Ollama on the same server as the API with suitable RAM/GPU; a small web-host plan will not provide that hardware. The Render blueprint disables local AI rather than using a paid provider.
4. Create a Render Docker web service, or use `render.yaml` as a blueprint. The blueprint selects Render's paid **starter** plan; review its current price before creating the service. An existing compatible host also works.
5. Set the server environment variables. Set `APP_ORIGIN` to the exact public HTTPS origin, e.g. `https://fittrack.example.com`, without a trailing slash. Set `TRUST_PROXY=1` only if there is exactly one trusted reverse proxy.
6. Deploy. The server serves both the frontend and `/api` from one origin. Set the health check to `/api/health`. Production fails startup without MongoDB, an HTTPS origin or SMTP; photo uploads require Cloudinary. AI remains optional.
7. Run the account/food/workout/photo/reset journey against staging, verify email delivery and camera permissions over HTTPS, and inspect provider costs and logs before sharing the app.

For an existing Node host: `npm ci`, `npm run build`, then `NODE_ENV=production npm start` with environment variables supplied by the host.

## Data and operational notes

- All private data queries include the authenticated owner. Unique compound indexes protect daily plans, sets, histories and records. Water and food/expense request IDs prevent duplicated submissions from the supplied client.
- Weekly split edits take effect today only if no sets have been recorded; otherwise tomorrow. Saved historical plan snapshots determine historical rest days. All-rest schedules are valid.
- A streak counts explicit exercise completions, once per local calendar day. Today is pending until midnight. Rest does not consume or reset the missed-day freeze. Undo removes that day's completion if no other completed exercise remains; the longest-ever count is retained.
- Personal records require completed sets **and** explicit exercise confirmation. Weight comparisons/volume use kg internally. Estimated 1RM uses Epley for 1–12 repetitions; it is not a recommendation to test a maximum.
- Current calorie targets are used for report comparisons. Missing food-log days count as zero _recorded intake_, not as proven fasting. Budget periods are today, a rolling seven days, or the calendar month.
- Body weight is entered in kg; workout loads support kg/lbs. Nutrition estimates are for adults 18+ and are not medical prescriptions. The sex-equation midpoint option averages the equation's constants.
- Timezone is set during onboarding and stays fixed to protect historical date consistency. Account migration to another timezone requires a deliberate historical-date policy before enabling edits.
- This release runs as **one API process**. Same-user mutations are serialized in process, with MongoDB unique indexes as additional protection. Before horizontal scaling, replace in-process mutation queues/rate limiting with a shared lock/limiter and use MongoDB transactions for multi-collection workflows. Configure observability, backups, retention and operational alerts for your environment.
- Sessions last 30 days. Password-reset tokens last 30 minutes and are single-use. Write requests reject foreign origins; session cookies are HTTP-only, SameSite Strict and Secure in production. Image uploads are decoded and re-encoded, bounded to 5 MB/25 megapixels, and stripped of original metadata. AI requests are bounded and rate limited.
- Push/email reminder delivery and Google login are not included. Reminders operate inside the app. Android imports steps through Health Connect; other activity fields are entered manually.

## Project structure

```text
src/                 React screens, components, API/session state, responsive styles
shared/              Zod contracts, nutrition/date/streak math, exercise catalog/media
server/models.ts     MongoDB schemas, timestamps and indexes
server/routes/       Auth and owner-scoped REST handlers
server/services/     AI, plans, aggregation, email and image storage
tests/               Domain/API tests and browser journey
scripts/             Reproducible exercise-media metadata tools
public/exercises/    Licensed, cached exercise images (when fetched)
```

The implementation sequence and database invariants are documented in [IMPLEMENTATION.md](IMPLEMENTATION.md).
