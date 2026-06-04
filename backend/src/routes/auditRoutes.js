const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const checkRole = require('../middlewares/checkRole');

// Solo administradores pueden ver los logs
router.get('/', [checkRole(['admin'])], auditController.getLogs);

module.exports = router;
