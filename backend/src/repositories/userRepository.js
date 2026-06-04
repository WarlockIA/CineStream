const User = require('../models/User');

class UserRepository {
  async findByEmail(email) {
    return await User.findOne({ where: { email } });
  }

  async create(userData) {
    return await User.create(userData);
  }
}

// Exportamos una instancia para usarla como Singleton
module.exports = new UserRepository();
