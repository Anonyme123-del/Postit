const crypto = require('node:crypto');
const authService = require('../services/auth.service');

function signupForm(req, res) {
  return res.render('signup', {
    title: 'Inscription',
    errors: [],
    formData: {
      username: ''
    }
  });
}

async function signup(req, res, next) {
  try {
    const { username, password, passwordConfirm } = req.body;
    const errors = [];

    if (!username || !String(username).trim()) {
      errors.push("Le nom d'utilisateur est obligatoire.");
    }

    if (!password || !passwordConfirm) {
      errors.push('Veuillez remplir tous les champs du mot de passe.');
    }

    if (password !== passwordConfirm) {
      errors.push('Les mots de passe ne correspondent pas.');
    }

    if (errors.length > 0) {
      return res.status(400).render('signup', {
        title: 'Inscription',
        errors,
        formData: {
          username: String(username || '').trim()
        }
      });
    }

    const user = await authService.createUser(username, password);

    req.session.regenerate((err) => {
      if (err) {
        return next(err);
      }

      req.session.user = user;
      req.session.csrfToken = crypto.randomBytes(32).toString('hex');
      req.session.notice = `Bienvenue ${user.username}.`;

      return res.redirect('/');
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).render('signup', {
        title: 'Inscription',
        errors: error.messages,
        formData: {
          username: String(req.body.username || '').trim()
        }
      });
    }

    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { username, password, boardSlug } = req.body;
    const user = await authService.authenticate(username, password);

    if (!user) {
      req.session.notice = 'Identifiants invalides.';
      return res.redirect(boardSlug ? `/${boardSlug}` : '/');
    }

    req.session.regenerate((err) => {
      if (err) {
        return next(err);
      }

      req.session.user = user;
      req.session.csrfToken = crypto.randomBytes(32).toString('hex');
      req.session.notice = `Connexion reussie. Bonjour ${user.username}.`;

      return res.redirect(boardSlug ? `/${boardSlug}` : '/');
    });
  } catch (error) {
    return next(error);
  }
}

function logout(req, res, next) {
  const redirectTo = req.body.boardSlug ? `/${req.body.boardSlug}` : '/';

  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }

    res.clearCookie('connect.sid');
    return res.redirect(redirectTo);
  });
}

module.exports = {
  signupForm,
  signup,
  login,
  logout
};