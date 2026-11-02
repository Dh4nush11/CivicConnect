const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to access this resource' });
    }
    return next();
  };
};

const requireCitizen = requireRole('citizen');

const requireAuthorityOrAdmin = requireRole('officer', 'admin');

module.exports = {
  requireRole,
  authorize: requireRole,
  requireCitizen,
  requireOfficerOrAdmin: requireAuthorityOrAdmin,
  requireAuthorityOrAdmin,
};
