const roomRepository = require('../repositories/roomRepository');

class RoomService {
  async getAllRooms() {
    return await roomRepository.findAll();
  }
}

module.exports = new RoomService();
