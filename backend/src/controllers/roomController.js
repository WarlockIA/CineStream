const roomService = require('../services/roomService');

class RoomController {
  async getAllRooms(req, res) {
    try {
      const rooms = await roomService.getAllRooms();
      res.status(200).json({
        success: true,
        data: rooms
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener la lista de salas',
        error: error.message
      });
    }
  }
}

module.exports = new RoomController();
