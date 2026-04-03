const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { redirectIfAuthenticated, requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Trop de tentatives. Réessaie plus tard.'
});

router.get('/signup', redirectIfAuthenticated, authController.showSignupPage);
router.post('/signup', authLimiter, redirectIfAuthenticated, authController.signup);

router.get('/login', redirectIfAuthenticated, authController.showLoginPage);
router.post('/login', authLimiter, redirectIfAuthenticated, authController.login);

router.post('/logout', requireAuth, authController.logout);

module.exports = router;