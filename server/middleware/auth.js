const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isSuspended } = require('../utils/issuePolicy');
const { primaryAdminEmail } = require('../config/roles');

const createProtect = ({ allowSuspended = false, optional = false, appealOnly = false } = {}) => async (req, res, next) => {
  const authorization = req.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    if (optional) return next();
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (optional) return next();
    return res.status(401).json({
      success: false,
      message: error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
      code: error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
    });
  }
  if ((appealOnly && decoded.purpose !== 'suspension-appeal') ||
      (!appealOnly && decoded.purpose === 'suspension-appeal')) {
    return res.status(401).json({
      success: false,
      message: 'This token is not valid for this resource.',
      code: 'INVALID_TOKEN_SCOPE',
    });
  }

  try {
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The account for this token no longer exists',
        code: 'INVALID_TOKEN',
      });
    }

    if (user.approvalStatus === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Your account is awaiting administrator approval.',
        code: 'ACCOUNT_PENDING_APPROVAL',
      });
    }

    if (user.email.toLowerCase() === primaryAdminEmail && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    if (user.passwordChangedAt && decoded.iat) {
      const changedAtSec = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (decoded.iat < changedAtSec) {
        return res.status(401).json({
          success: false,
          message: 'Password changed; please log in again',
          code: 'PASSWORD_CHANGED',
        });
      }
    }

    if (isSuspended(user) && !allowSuspended) {
      const appealToken = jwt.sign(
        { id: user._id, purpose: 'suspension-appeal' },
        process.env.JWT_SECRET,
        { expiresIn: '30m' }
      );
      return res.status(403).json({
        success: false,
        message: `This account is suspended${user.suspensionReason ? `: ${user.suspensionReason}` : ''}`,
        code: 'ACCOUNT_SUSPENDED',
        data: { appealToken },
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

const protect = createProtect();
const protectAllowSuspended = createProtect({ allowSuspended: true });
const protectAppeal = createProtect({ allowSuspended: true, appealOnly: true });
const optionalProtect = createProtect({ optional: true });

module.exports = { protect, protectAllowSuspended, protectAppeal, optionalProtect };
