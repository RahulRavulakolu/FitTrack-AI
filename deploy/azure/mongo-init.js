// Runs once for a new volume. Never resets credentials on an existing database.
const password = process.env.MONGO_APP_PASSWORD;
if (!/^[a-f0-9]{64}$/.test(password || '')) throw new Error('Generate MONGO_APP_PASSWORD first');
db.getSiblingDB('fittrack').createUser({
  user: 'fittrack',
  pwd: password,
  roles: [{ role: 'readWrite', db: 'fittrack' }],
});
