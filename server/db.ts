import mongoose from 'mongoose';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ExerciseModel } from './models.js';
import { catalog } from '../shared/catalog.js';
let localMongo: MongoMemoryServer | undefined;
export async function connectDatabase() {
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    if (process.env.NODE_ENV === 'production')
      throw new Error('MONGODB_URI is required in production');
    const dbPath = resolve('.data/mongo');
    await mkdir(dbPath, { recursive: true });
    localMongo = await MongoMemoryServer.create({
      instance: { dbPath, dbName: 'fittrack', storageEngine: 'wiredTiger' },
      binary: { version: '7.0.24' },
    });
    uri = localMongo.getUri('fittrack');
    console.log('Local MongoDB started. Data persists in .data/mongo.');
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  await ExerciseModel.bulkWrite(
    catalog.map((e) => ({
      updateOne: { filter: { id: e.id }, update: { $set: e }, upsert: true },
    })),
  );
}
export async function closeDatabase() {
  await mongoose.disconnect();
  if (localMongo) await localMongo.stop({ doCleanup: false, force: false });
}
