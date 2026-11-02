require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Issue = require('../models/Issue');

const run = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI must be set.');
  await mongoose.connect(process.env.MONGO_URI);
  const roleMigration = await User.updateMany({ role: 'authority' }, { $set: { role: 'officer' } });
  const adminMigration = await User.updateMany(
    { email: 'dhanush11pillai@gmail.com' },
    { $set: { role: 'admin', approvalStatus: 'approved' } }
  );
  const submittedMigration = await Issue.updateMany({ status: 'reported' }, { $set: { status: 'submitted' } });
  const inProgressMigration = await Issue.updateMany({ status: 'in-progress' }, { $set: { status: 'in_progress' } });
  console.log(JSON.stringify({
    legacyAuthorityUsers: roleMigration.modifiedCount,
    primaryAdminUsers: adminMigration.modifiedCount,
    legacySubmittedReports: submittedMigration.modifiedCount,
    legacyInProgressReports: inProgressMigration.modifiedCount,
  }, null, 2));
};

run()
  .catch((error) => {
    console.error(`Role/status migration failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });
