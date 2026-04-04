function requireAuth(req, res, next) {
  if (!req.session.user) {
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      req.session.notice = 'Veuillez vous connecter.';
      return res.redirect('/');
    }

    return res.status(401).json({ error: 'Authentification requise.' });
  }

  return next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      req.session.notice = 'Veuillez vous connecter.';
      return res.redirect('/');
    }

    return res.status(401).json({ error: 'Authentification requise.' });
  }

  if (!req.session.user.permissions?.isAdmin) {
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      req.session.notice = 'Accès réservé aux administrateurs.';
      return res.redirect('/');
    }

    return res.status(403).json({ error: 'Accès refusé.' });
  }

  return next();
}

function requirePermission(permissionName) {
  return (req, res, next) => {
    if (!req.session.user) {
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        req.session.notice = 'Veuillez vous connecter.';
        return res.redirect('/');
      }

      return res.status(401).json({ error: 'Authentification requise.' });
    }

    if (req.session.user.permissions?.isAdmin) {
      return next();
    }

    if (!req.session.user.permissions?.[permissionName]) {
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        req.session.notice = 'Permission insuffisante.';
        return res.redirect('/');
      }

      return res.status(403).json({ error: 'Permission insuffisante.' });
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  requireAdmin,
  requirePermission
};