import 'dotenv/config';
import { connectDatabase, closeDatabase } from '../server/db';
import { User, privateModels } from '../server/models';
import { deleteUserImages } from '../server/services/images';
if (process.env.NODE_ENV === 'production' || process.env.MONGODB_URI) {
  throw new Error('This cleanup is restricted to the local development database.');
}
await connectDatabase();
try {
  const testUsers = await User.find({
    name: 'Browser Journey',
    email: { $regex: /^browser-\d+@fittrack\.invalid$/ },
  });
  for (const user of testUsers) {
    await deleteUserImages(String(user._id));
    for (const model of privateModels) await model.deleteMany({ userId: user._id });
    await User.deleteOne({ _id: user._id });
  }
  console.log(
    `Removed ${testUsers.length} browser-test accounts from the local development database.`,
  );
} finally {
  await closeDatabase();
}
