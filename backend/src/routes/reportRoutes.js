const { Router } = require('express');
const reportController = require('../controllers/reportController');
const checkRole = require('../middlewares/checkRole');

const router = Router();

// Endpoint exclusivo para Administradores
router.get('/dashboard', checkRole(['admin']), reportController.getDashboardData);

module.exports = router;
