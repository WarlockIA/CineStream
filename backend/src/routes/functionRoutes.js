const { Router } = require('express');
const functionController = require('../controllers/functionController');
const checkRole = require('../middlewares/checkRole');

const router = Router();

// Endpoint para crear funciones (solo administradores)
router.post('/', checkRole(['admin']), functionController.createFunction);

// Endpoint público para que los clientes consulten la cartelera
router.get('/', functionController.getFunctions);

// Endpoint público para obtener detalles de una función específica
router.get('/:id', functionController.getFunctionById);

// Endpoint para actualizar una función (solo administradores)
router.put('/:id', checkRole(['admin']), functionController.updateFunction);

// Endpoint para eliminar una función (solo administradores)
router.delete('/:id', checkRole(['admin']), functionController.deleteFunction);

// Endpoint para obtener aforo/validaciones (porteros y administradores)
router.get('/:id/validations', checkRole(['porter', 'admin']), functionController.getFunctionValidations);

module.exports = router;
