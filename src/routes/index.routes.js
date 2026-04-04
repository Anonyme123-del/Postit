const express = require('express');
const pageController = require('../controllers/page.controller');

const router = express.Router();

router.get('/', pageController.home);
router.get('/health', pageController.health);
router.get('/:boardSlug([a-zA-Z0-9_-]+)', pageController.board);

module.exports = router;