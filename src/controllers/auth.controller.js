const authService = require('../services/auth.service');

function signupForm(req, res) {
  res.render('signup', {
    title: 'Inscription'
  });
}

async function signup(req, res) {
  try {
    const { username, password, passwordConfirm } = req.body;

    if (!username || !password) {
      req.session.notice = 'Veuillez remplir tous les champs.';
      res.redirect('/signup');
      return;
    }

    if (password !== passwordConfirm) {
      req.session.notice = 'Les mots de passe ne correspondent pas.';
      res.redirect('/signup');
      return;
    }

    const user = await authService.createUser(username, password);
    req.session.user = user;
    req.session.notice = `Bienvenue ${user.username}.`;
    res.redirect('/');
  } catch (error) {
    req.session.notice = error.message;
    res.redirect('/signup');
  }
}

async function login(req, res) {
  const { username, password, boardSlug } = req.body;
  const user = await authService.authenticate(username, password);

  if (!user) {
    req.session.notice = 'Identifiants invalides.';
    res.redirect(boardSlug ? `/${boardSlug}` : '/');
    return;
  }

  req.session.user = user;
  req.session.notice = `Connexion reussie. Bonjour ${user.username}.`;
  res.redirect(boardSlug ? `/${boardSlug}` : '/');
}

function logout(req, res) {
  const redirectTo = req.body.boardSlug ? `/${req.body.boardSlug}` : '/';
  req.session.destroy(() => {
    res.redirect(redirectTo);
  });
}

module.exports = {
  signupForm,
  signup,
  login,
  logout
};