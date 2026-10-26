import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { connectDatabase } from '../config/db.js';

const [name = 'Demo Teacher', email = 'teacher@example.com', password = 'teacher123'] = process.argv.slice(2);

try {
  await connectDatabase();
  const passwordHash = await bcrypt.hash(password, 12);
  await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { name, email: email.toLowerCase(), passwordHash, role: 'teacher', $unset: { studentId: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`Teacher ready: ${email}`);
} catch (error) {
  console.error('Unable to seed teacher:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
