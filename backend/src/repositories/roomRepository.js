const { Room } = require('../models');

class RoomRepository {
  async findAll() {
    return await Room.findAll({
      order: [['name', 'ASC']]
    });
  }
}

module.exports = new RoomRepository();
