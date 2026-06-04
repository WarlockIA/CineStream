const express = require('express');
const router = express.Router();
const userProfileController = require('../controllers/userProfileController');
const ticketController = require('../controllers/ticketController');
const checkRole = require('../middlewares/checkRole');

// Ruta protegida para que cualquier usuario vea su propio perfil
router.get('/profile', checkRole(['client', 'staff', 'admin', 'porter']), userProfileController.getProfile);

// Obtener cupones activos del usuario
router.get('/coupons', checkRole(['client', 'cliente', 'admin', 'staff']), ticketController.getMyCoupons);

// Membresía Premium y Canje de Puntos
router.post('/subscribe-premium', checkRole(['client', 'cliente', 'admin', 'staff']), userProfileController.subscribePremium);
router.get('/points-history', checkRole(['client', 'cliente', 'admin', 'staff']), userProfileController.getPointsHistory);

module.exports = router;
