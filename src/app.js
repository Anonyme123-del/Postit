const path = require('path');
const express = require('express');
const nunjucks = require('nunjucks');
const session = require('express-session');

const sessionConfig = require('./config/session');
const authService = require('./services/auth.service');

const indexRoutes = require('./routes/index.routes');
const authRoutes = require('./routes/auth.routes');
const postitRoutes = require('./routes/postit.routes');
const adminRoutes = require('./routes/admin.routes');
const helmet = require('helmet');



const {
  ensureCsrfToken,
  verifyCsrfToken
} = require('./middleware/csrfMiddleware');

const {
  blockCrossSiteStateChanges
} = require('./middleware/fetchMetadataMiddleware');

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

// Middlewares de sécurité
app.use(blockCrossSiteStateChanges);
app.use(ensureCsrfToken);
app.use(verifyCsrfToken);
app.use(helmet());

// Variables globales des vues
app.use(async (req, res, next) => {
  try {
    const currentUser = req.session.user || null;

    const permissions = currentUser
      ? currentUser.permissions
      : {
          canCreate: false,
          canUpdate: false,
          canDelete: false,
          isAdmin: false
        };

    res.locals.currentUser = currentUser;
    res.locals.permissions = permissions;
    res.locals.notice = req.session.notice || null;
    res.locals.csrfToken = req.session.csrfToken || null;

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

  if (
    req.path.startsWith('/liste') ||
    req.path.startsWith('/ajouter') ||
    req.path.startsWith('/effacer') ||
    req.path.startsWith('/modifier') ||
    req.path.startsWith('/deplacer') ||
    req.path.startsWith('/events')
  ) {
    return res.status(500).json({ error: 'Erreur interne du serveur.' });
  }

  req.session.notice = 'Une erreur interne est survenue.';
  return res.redirect('/');
});

module.exports = app;