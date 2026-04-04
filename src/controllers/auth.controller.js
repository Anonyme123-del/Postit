const authService = require('../services/auth.service');

function signupForm(req, res) {
  res.render('signup', {
    title: 'Inscription',
    old: {
      username: ''
    }
  });
}

async function signup(req, res) {
  try {
    const { username, password, passwordConfirm } = req.body;

    if (!username || !password || !passwordConfirm) {
      req.session.notice = 'Veuillez remplir tous les champs.';
      return res.redirect('/signup');
    }

    if (password !== passwordConfirm) {
      req.session.notice = 'Les mots de passe ne correspondent pas.';
      return res.redirect('/signup');
    }

    const user = await authService.createUser(username, password);

    req.session.regenerate((error) => {
      if (error) {
        console.error('Erreur regenerate signup :', error);
        req.session.notice = 'Erreur de session.';
        return res.redirect('/signup');
      }

      req.session.user = user;
      req.session.notice = `Bienvenue ${user.username}.`;

      return req.session.save((saveError) => {
        if (saveError) {
          console.error('Erreur save session signup :', saveError);
          return res.redirect('/signup');
        }

        return res.redirect('/');
      });
    });
  } catch (error) {
    req.session.notice = error.message || 'Erreur lors de l’inscription.';
    return res.redirect('/signup');
  }
}

async function login(req, res) {
  try {
    const { username, password, boardSlug } = req.body;

    if (!username || !password) {
      req.session.notice = 'Veuillez saisir votre nom d’utilisateur et votre mot de passe.';
      return res.redirect(boardSlug ? `/${boardSlug}` : '/');
    }

    const user = await authService.authenticate(username, password);

    if (!user) {
      req.session.notice = 'Identifiants invalides.';
      return res.redirect(boardSlug ? `/${boardSlug}` : '/');
    }

    req.session.regenerate((error) => {
      if (error) {
        console.error('Erreur regenerate login :', error);
        req.session.notice = 'Erreur de session.';
        return res.redirect(boardSlug ? `/${boardSlug}` : '/');
      }

      req.session.user = user;
      req.session.notice = `Connexion réussie. Bonjour ${user.username}.`;

      return req.session.save((saveError) => {
        if (saveError) {
          console.error('Erreur save session login :', saveError);
          req.session.notice = 'Erreur de session.';
          return res.redirect(boardSlug ? `/${boardSlug}` : '/');
        }

        return res.redirect(boardSlug ? `/${boardSlug}` : '/');
      });
    });
  } catch (error) {
    console.error('Erreur login :', error);
    req.session.notice = 'Une erreur est survenue pendant la connexion.';
    return res.redirect('/');
  }
}

function loginForm(req, res) {
  res.render('login', {
    title: 'Connexion',
    old: {
      username: ''
    }
  });
}

function logout(req, res) {
  const redirectTo = req.body.boardSlug ? `/${req.body.boardSlug}` : '/';

  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    return res.redirect(redirectTo);
  });
}

module.exports = {
  signupForm,
  signup,
  loginForm,
  login,
  logout
};