const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findUserByEmail = (UserModel, email) => {
  const normalizedEmail = normalizeEmail(email);
  return UserModel.findOne({
    email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: 'i' },
  });
};

module.exports = { normalizeEmail, findUserByEmail };
