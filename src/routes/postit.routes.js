const express = require('express');
const postitController = require('../controllers/postit.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/liste/:boardSlug?', postitController.list);
router.get('/events/:boardSlug?', postitController.events);
router.post('/ajouter', requireAuth, postitController.add);
router.post('/effacer', requireAuth, postitController.remove);
router.post('/modifier', requireAuth, postitController.update);
router.post('/deplacer', requireAuth, postitController.move);

module.exports = router;