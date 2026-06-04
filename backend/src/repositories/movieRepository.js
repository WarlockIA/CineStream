const Movie = require('../models/Movie');
const Function = require('../models/Function');

class MovieRepository {
  async create(movieData) {
    return await Movie.create(movieData);
  }

  async findById(id) {
    return await Movie.findByPk(id);
  }

  async update(id, movieData) {
    return await Movie.update(movieData, { where: { id } });
  }

  async findAll() {
    return await Movie.findAll({
      order: [['createdAt', 'DESC']]
    });
  }

  async countFunctions(movieId) {
    return await Function.count({
      where: { movieId }
    });
  }

  async delete(id) {
    return await Movie.destroy({ where: { id } });
  }

  async deleteFutureFunctions(movieId) {
    const { Op } = require('sequelize');
    return await Function.destroy({
      where: {
        movieId,
        startTime: {
          [Op.gt]: new Date()
        }
      }
    });
  }
}

module.exports = new MovieRepository();
