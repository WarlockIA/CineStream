const { Router } = require('express');
const roomController = require('../controllers/roomController');

const router = Router();

router.get('/', roomController.getAllRooms);

module.exports = router;
