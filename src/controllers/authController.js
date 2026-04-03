const authService = require('../services/auth.service');

async function showSignupPage(req, res) {
  res.render('signup', { error: null, old: {} });
}

async function signup(req, res) {
  try {
    const { username, password, passwordConfirm } = req.body;

    if (password !== passwordConfirm) {
      throw new Error('Les mots de passe ne correspondent pas.');
    }

    const user = await authService.registerUser(username, password);

    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).render('signup', {
          error: 'Erreur de session.',
          old: { username }
        });
      }

      req.session.user = user;
      res.redirect('/');
    });
  } catch (error) {
    res.status(400).render('signup', {
      error: error.message,
      old: { username: req.body.username || '' }
    });
  }
}

async function showLoginPage(req, res) {
  res.render('login', {
    error: null,
    old: {}
  });
}

async function login(req, res) {
  try {
    const { username, password } = req.body;
    console.log('POST /login reçu =', req.body);

    const user = await authService.loginUser(username, password);
    console.log('USER authentifié =', user);

    req.session.regenerate((err) => {
      if (err) {
        console.error('Erreur regenerate session =', err);
        return res.status(500).render('login', {
          error: 'Erreur de session.',
          old: { username }
        });
      }

      req.session.user = user;
      console.log('SESSION USER =', req.session.user);

      res.redirect('/');
    });
  } catch (error) {
    console.error('ERREUR LOGIN =', error);
    res.status(400).render('login', {
      error: 'Identifiants invalides.',
      old: {
        username: req.body.username || ''
      }
    });
  }
}

function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
}

module.exports = {
  showSignupPage,
  signup,
  showLoginPage,
  login,
  logout
};