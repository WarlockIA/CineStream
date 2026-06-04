const { Router } = require('express');
const ticketController = require('../controllers/ticketController');
const checkRole = require('../middlewares/checkRole');

const router = Router();

// Compra online: cliente o admin
router.post('/checkout', checkRole(['client', 'cliente', 'admin', 'staff']), ticketController.purchaseTicket);

// Venta en taquilla (POS): staff o admin — registra staffId para auditoría
router.post('/pos-checkout', checkRole(['staff', 'admin']), ticketController.posPurchaseTicket);

// Mis tickets (cliente)
router.get('/my-tickets', checkRole(['client', 'cliente', 'admin']), ticketController.getUserTickets);

// Escaneo de QR por portero
router.post('/scan-qr', checkRole(['porter', 'admin']), ticketController.scanTicket);

// Escaneo de QR de snacks por staff/cajero/portero/admin
router.post('/scan-snacks-qr', checkRole(['porter', 'staff', 'admin']), ticketController.scanSnacksTicket);

// Confirmar pago QR
router.post('/confirm-qr-payment', checkRole(['client', 'cliente', 'admin', 'staff']), ticketController.confirmQrPayment);

// Cancelar ticket y recibir cupón (cliente o admin)
router.post('/:id/cancel', checkRole(['client', 'cliente', 'admin']), ticketController.cancelTicket);

// Validar / Aplicar cupón antes de la compra
router.post('/apply-coupon', checkRole(['client', 'cliente', 'admin', 'staff']), ticketController.applyCoupon);

// Obtener todos los cupones (solo admins)
router.get('/admin/coupons', checkRole(['admin']), ticketController.getAllCoupons);

// Anular un cupón (solo admins)
router.post('/admin/coupons/:id/revoke', checkRole(['admin']), ticketController.revokeCoupon);

module.exports = router;
