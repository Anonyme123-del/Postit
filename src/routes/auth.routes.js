const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Trop de tentatives. Réessaie plus tard.'
});

router.get('/signup', authController.signupForm);
router.post('/signup', authLimiter, authController.signup);

router.get('/login', authController.loginForm);
router.post('/login', authLimiter, authController.login);

router.post('/logout', authController.logout);

module.exports = router;