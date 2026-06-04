const { Router } = require('express');
const productController = require('../controllers/productController');
const checkRole = require('../middlewares/checkRole');

const router = Router();

// Endpoint público para que los clientes vean los snacks
router.get('/', productController.getAllProducts);

// Endpoint protegido para que el personal de dulcería registre ventas
router.post('/sell', checkRole(['staff', 'admin']), productController.sellProducts);

// Endpoint protegido para que admin actualice stock/precio
router.put('/:id', checkRole(['admin']), productController.updateProduct);

module.exports = router;
