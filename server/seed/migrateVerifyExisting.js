const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const User = require('../models/User');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for migration...');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

const run = async () => {
  try {
    await connectDB();

    const result = await User.updateMany(
      { $or: [{ isEmailVerified: { $exists: false } }, { isEmailVerified: false }] },
      { $set: { isEmailVerified: true } }
    );

    console.log(`Migration complete: marked ${result.modifiedCount} existing users as email verified.`);
    console.log(`Total users matched: ${result.matchedCount}`);

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

run();
