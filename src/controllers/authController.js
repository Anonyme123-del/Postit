const authService = require('../services/auth.service');

async function showSignupPage(req, res) {
  res.render('signup', { error: null });
}

async function signup(req, res) {
  try {
    const { username, password, passwordConfirm } = req.body;

    if (password !== passwordConfirm) {
        throw new Error('Les mots de passe ne correspondent pas.');
    }

    const user = await authService.registerUser(username, password);

    req.session.user = user;

    res.redirect('/');
  } catch (error) {
    res.status(400).render('signup', {
      error: error.message
    });
  }
}

module.exports = {
  showSignupPage,
  signup
};