# FitTrack AI implementation plan

Build in order. Each phase depends on the previous phase's persisted API data.

1. Foundation: React/TypeScript/Vite client; Express REST server; Mongoose models; bcrypt credentials; opaque, hashed, revocable cookie sessions; reset email; owner-scoped queries.
2. Onboarding: six-step form, optional cropped photo, lifestyle/preferences, shared Mifflin–St Jeor calculation, explicit custom targets, persistent initial split and weight.
3. Dashboard: exactly four primary routes, live summaries, local-date activity/water, temporal split-aware streaks and calendar, real empty states.
4. Nutrition: manual/favorite foods, camera preview, validated vision JSON, editable confirmed estimates, dated history and weekly report.
5. Workouts: versioned splits, persisted deterministic catalog routines plus optional AI generation, separate per-set documents, explicit completion and undo, confirmed-set records/history/progression.
6. Profile: editable profile/targets/preferences, crop/upload/remove avatar, weight history, settings, session revocation, account deletion.
7. Additional features: budget expenses, water, nutrition/strength/weight charts, optional grounded AI assistant.
8. Verification and release: domain tests, isolated MongoDB API journey and security tests, browser journey/mobile layout, production build, Docker and deployment instructions.
9. Android and iPhone: Capacitor projects with bundled UI assets, native camera/photos/share, Android Keystore and iOS Keychain sessions, server-connection configuration, Android APK build tooling and an iOS source package for macOS/Xcode signing. See MOBILE.md for installation and verification limits.

## Architecture

`src/pages` owns route screens; `src/components` reusable forms/media/layout; `src/lib` API/session state. `shared` contains runtime Zod contracts and pure date/nutrition/streak/catalog logic shared by client and server. `server/routes` handles HTTP validation; `server/services` contains plans, aggregation, uploads, email, AI; `server/models.ts` defines MongoDB collections; `server/middleware.ts` centralizes authentication and errors.

## Database and invariants

Users have unique normalized emails and bcrypt hashes. Sessions and password-reset tokens are hashed at rest with TTL indexes. FitnessProfiles and UserSettings each have one owner record. FoodLogs, ActivityLogs, WaterLogs, WeightHistory, FoodExpenses and FavoriteFoods are always owner-scoped. WorkoutSplits are weekly versions with an effective local date. WorkoutPlans are one immutable day snapshot per owner/date once performance is recorded. WorkoutSetLogs are separate owner/plan/exercise/set records with a compound unique index. WorkoutHistory, PersonalRecords and StreakHistory are derived from confirmed records and persisted with compound unique keys.

Completed historical plans are never rewritten by split changes. A split starts today if there are no performance records; otherwise tomorrow. Streaks iterate local calendar days using each day's effective split, skip rest days, count each confirmed day once, freeze for one missed scheduled day, and reset after the second consecutive scheduled miss. Today is never considered missed until it ends. Longest-ever streak is monotonic. Future records are rejected. Set weights are normalized to kg for records and volume; display can use kg/lbs.

## Service configuration

AI runs through loopback Ollama using the free Qwen3-VL 2B instruction/vision model. No paid LLM provider remains. The local launcher disables cloud inference, and responses use validated JSON schemas. MongoDB Atlas, Cloudinary and SMTP remain optional production infrastructure. Development uses a real persistent local MongoDB process and local uploads; reset messages are written to private `.data/mail`. See LOCAL_AI.md.

Android Health Connect reads only aggregate step totals with READ_STEPS permission. Per-account/device opt-in controls foreground sync. Owner-scoped daily snapshots replace counts, reject stale timestamps and preserve manual distance/minutes/calories. Health Connect permission revocation never writes a false zero. Read-only Health Connect integration does not alter the source records.

## Privacy and safety

HTTP-only same-site cookie sessions, origin checks on writes, bounded JSON/multipart inputs, decoded/re-encoded image validation, rate-limited credentials and AI, no frontend secrets, owner-scoped database operations, explicit AI-food confirmation, and validated grounded AI context. Nutrition values are estimates and progression suggestions never silently change weights.
