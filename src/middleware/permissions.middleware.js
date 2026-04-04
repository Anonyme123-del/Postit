function requirePermission(permissionKey) {
  return (req, res, next) => {
    const permissions = req.session.user?.permissions || {};

    if (!permissions[permissionKey]) {
      return res.status(403).json({ error: 'Permission insuffisante.' });
    }

    return next();
  };
}

module.exports = {
  requirePermission
};