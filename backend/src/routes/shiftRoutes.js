const { Router } = require('express');
const shiftController = require('../controllers/shiftController');
const checkRole = require('../middlewares/checkRole');

const router = Router();

// Todas las rutas de turnos requieren rol staff o admin
router.use(checkRole(['staff', 'admin']));

router.get('/current', shiftController.getCurrentShift);
router.get('/summary', shiftController.getShiftSummary);
router.post('/open', shiftController.openShift);
router.post('/close', shiftController.closeShift);

module.exports = router;
