const { Router } = require('express');
const userController = require('../controllers/userController');

const router = Router();

// Ruta POST /api/auth/register
router.post('/register', userController.register);

// Ruta POST /api/auth/login
router.post('/login', userController.login);

module.exports = router;
