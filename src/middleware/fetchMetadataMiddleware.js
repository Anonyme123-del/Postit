function blockCrossSiteStateChanges(req, res, next) {
  const method = req.method.toUpperCase();

  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return next();
  }

  const site = req.get('sec-fetch-site');

  if (!site) {
    return next();
  }

  if (site === 'cross-site') {
    const error = new Error('Requête cross-site bloquée.');
    error.status = 403;
    return next(error);
  }

  next();
}

module.exports = {
  blockCrossSiteStateChanges
};