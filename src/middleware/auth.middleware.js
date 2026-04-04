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
  if (!req.session.user || !req.session.user.permissions?.isAdmin) {
    req.session.notice = 'Acces reserve aux administrateurs.';
    return res.redirect('/');
  }

  return next();
}

module.exports = {
  requireAuth,
  requireAdmin
};