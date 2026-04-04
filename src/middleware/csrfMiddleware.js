const crypto = require('node:crypto');

function ensureCsrfToken(req, res, next) {
  if (!req.session) {
    return next(new Error('Session non initialisée.'));
  }

  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function verifyCsrfToken(req, res, next) {
  const method = req.method.toUpperCase();

  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return next();
  }

  const tokenFromBody = req.body?._csrf;
  const tokenFromHeader = req.get('x-csrf-token');
  const token = tokenFromBody || tokenFromHeader;

  if (!req.session || !req.session.csrfToken) {
    const error = new Error('Session CSRF invalide.');
    error.status = 403;
    return next(error);
  }

  if (!token || token !== req.session.csrfToken) {
    const error = new Error('Jeton CSRF invalide.');
    error.status = 403;
    return next(error);
  }

  next();
}

module.exports = {
  ensureCsrfToken,
  verifyCsrfToken
};