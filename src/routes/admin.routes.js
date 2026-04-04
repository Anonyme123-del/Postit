const express = require('express');
const adminController = require('../controllers/admin.controller');
const { requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/admin', requireAdmin, adminController.dashboard);
router.post('/admin/permissions', requireAdmin, adminController.updatePermissions);
router.post('/admin/users/create', requireAdmin, adminController.createUser);
router.post('/admin/users/delete', requireAdmin, adminController.deleteUser);
router.post('/admin/boards/create', requireAdmin, adminController.createBoard);
router.post('/admin/boards/delete', requireAdmin, adminController.deleteBoard);

module.exports = router;