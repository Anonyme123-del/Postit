const path = require('path');
const express = require('express');
const nunjucks = require('nunjucks');
const session = require('express-session');

const sessionConfig = require('./config/session');
const authService = require('./services/auth.service');

const { ensureCsrfToken, verifyCsrfToken } = require('./middleware/csrfMiddleware');
const { blockCrossSiteStateChanges } = require('./middleware/fetchMetadataMiddleware');

const indexRoutes = require('./routes/index.routes');
const authRoutes = require('./routes/auth.routes');
const postitRoutes = require('./routes/postit.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

nunjucks.configure(path.join(__dirname, 'views'), {
  autoescape: true,
  express: app,
  noCache: process.env.NODE_ENV !== 'production'
});

app.set('view engine', 'njk');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session(sessionConfig));
app.use(express.static(path.join(process.cwd(), 'public')));

/**
 * 1. Crée / expose le token CSRF à toutes les vues
 */
app.use(ensureCsrfToken);

/**
 * 2. Bloque certaines requêtes cross-site avant traitement
 */
app.use(blockCrossSiteStateChanges);

/**
 * 3. Vérifie le token CSRF sur les requêtes sensibles
 */
app.use(verifyCsrfToken);

app.use(async (req, res, next) => {
  try {
    const currentUser = req.session.user || null;
    const permissions = currentUser
      ? currentUser.permissions
      : await authService.getPermissionsForUserId(null);

    res.locals.currentUser = currentUser;
    res.locals.permissions = permissions;
    res.locals.notice = req.session.notice || null;

    delete req.session.notice;
    next();
  } catch (error) {
    next(error);
  }
});

app.use('/', authRoutes);
app.use('/', postitRoutes);
app.use('/', adminRoutes);
app.use('/', indexRoutes);

app.use((error, req, res, next) => {
  console.error(error);

  const isApiRequest =
    req.path.startsWith('/liste') ||
    req.path.startsWith('/ajouter') ||
    req.path.startsWith('/effacer') ||
    req.path.startsWith('/modifier') ||
    req.path.startsWith('/deplacer') ||
    req.path.startsWith('/events');

  if (res.headersSent) {
    return next(error);
  }

  if (error.status === 403) {
    if (isApiRequest) {
      return res.status(403).json({ error: 'Requête refusée (CSRF ou origine invalide).' });
    }

    return res.status(403).send('Requête refusée pour raison de sécurité.');
  }

  if (isApiRequest) {
    return res.status(500).json({ error: 'Erreur interne du serveur.' });
  }

  // Avoid redirect loops when the home page itself is failing (e.g. database offline).
  return res.status(500).send('Erreur interne du serveur. Verifiez PostgreSQL et reessayez.');
});

module.exports = app;