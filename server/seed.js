require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const { primaryAdminEmail } = require('./config/roles');
const { sendEmail } = require('./utils/sendEmail');
const { officerWelcome } = require('./utils/emailTemplates');
const { normalizeEmail, findUserByEmail } = require('./utils/userEmails');

const seedAccounts = async () => {
  const { MONGO_URI, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!MONGO_URI || !ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('MONGO_URI, ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD must be set');
  }
  if (ADMIN_PASSWORD.length < 6) {
    throw new Error('ADMIN_PASSWORD must be at least 6 characters');
  }
  if (ADMIN_EMAIL.trim().toLowerCase() !== primaryAdminEmail) {
    throw new Error(`ADMIN_EMAIL must be ${primaryAdminEmail}`);
  }

  const accounts = [{ name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' }];
  const optionalAccounts = [
    { name: process.env.SEED_CITIZEN_NAME || 'Citizen', email: process.env.SEED_CITIZEN_EMAIL, password: process.env.SEED_CITIZEN_PASSWORD, role: 'citizen' },
    { name: process.env.SEED_OFFICER_NAME || 'Municipal Officer', email: process.env.SEED_OFFICER_EMAIL, password: process.env.SEED_OFFICER_PASSWORD, role: 'officer' },
  ];
  for (const account of optionalAccounts) {
    if (account.email || account.password) accounts.push(account);
  }
  for (const account of accounts) {
    if (!account.email || !account.password || account.password.length < 6) {
      throw new Error(`Valid email and password (minimum 6 characters) are required for the ${account.role} seed account`);
    }
  }
  const emails = accounts.map(({ email }) => normalizeEmail(email));
  if (new Set(emails).size !== emails.length) throw new Error('Seed account emails must be different');

  await mongoose.connect(MONGO_URI);
  let adminUser;
  for (const account of accounts) {
    const email = normalizeEmail(account.email);
    const existing = await findUserByEmail(User, email);
    if (existing) {
      if (account.role === 'admin' && email === primaryAdminEmail) {
        existing.role = 'admin';
        await existing.save();
        adminUser = existing;
      }
      console.log(`Account already exists for ${email}; existing credentials were not changed.`);
      continue;
    }
    const user = await User.create({
      name: account.name.trim(),
      email,
      password: account.password,
      role: account.role,
      isActive: true,
      isEmailVerified: true,
      approvalStatus: 'approved',
      ...(account.role === 'admin' ? {} : { approvedBy: adminUser?._id, approvedAt: new Date() }),
    });
    if (account.role === 'admin') adminUser = user;
    if (account.role === 'officer') {
      try {
        await sendEmail({
          to: email,
          subject: 'Your CivicConnect municipal officer sign-in details',
          html: officerWelcome({
            name: user.name,
            email,
            temporaryPassword: account.password,
          }),
          text: `Hello ${user.name}, your municipal officer account is ready. Sign-in email: ${email}. Temporary password: ${account.password}. Sign in at ${process.env.CLIENT_URL || 'http://localhost:5173'}/login and change this password as soon as possible.`,
        });
      } catch (emailError) {
        try {
          await User.findByIdAndDelete(user._id);
        } catch (cleanupError) {
          throw new Error(`Officer email failed (${emailError.message}) and the created account could not be removed (${cleanupError.message}).`);
        }
        throw new Error(`Officer account was removed because sign-in details could not be emailed: ${emailError.message}`);
      }
    }
    console.log(`Created ${account.role} account for ${email}.`);
  }
};

seedAccounts()
  .catch((error) => {
    console.error(`Admin seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
