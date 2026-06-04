const { Function, Movie, Room } = require('../models');
const { Op } = require('sequelize');

class FunctionRepository {
  async create(data) {
    return await Function.create(data);
  }

  async checkOverlap(roomId, startTime, endTime, excludeFunctionId = null) {
    // La sala estará ocupada si existe una función donde:
    // start existente < end nuevo Y end existente > start nuevo
    const whereClause = {
      roomId: roomId,
      [Op.and]: [
        { startTime: { [Op.lt]: endTime } },
        { endTime: { [Op.gt]: startTime } }
      ]
    };

    if (excludeFunctionId) {
      whereClause.id = { [Op.ne]: excludeFunctionId };
    }

    return await Function.findOne({ where: whereClause });
  }

  async findAll(filters) {
    const { date, movieId, includeInactive } = filters;
    const whereClause = {};

    // Si se pasa el ID de película, lo agregamos al filtro
    if (movieId) {
      whereClause.movieId = movieId;
    }

    // Si se pasa una fecha (YYYY-MM-DD), filtramos por todo ese día
    if (date) {
      // Aseguramos que abarque desde las 00:00:00 hasta las 23:59:59 del día solicitado en hora de Bolivia (UTC-4)
      const startDate = new Date(`${date}T00:00:00.000-04:00`);
      const endDate = new Date(`${date}T23:59:59.999-04:00`);
      
      whereClause.startTime = {
        [Op.between]: [startDate, endDate]
      };
    }

    const movieInclude = {
      model: Movie,
      attributes: ['title', 'duration', 'posterUrl', 'is_active', 'synopsis', 'genre']
    };

    // Filtrar películas inactivas y funciones pasadas a menos que se solicite incluirlas explícitamente
    if (includeInactive !== 'true') {
      movieInclude.where = { is_active: true };

      // Filtrar para que solo muestre funciones futuras
      const now = new Date();
      if (whereClause.startTime) {
        whereClause.startTime = {
          [Op.and]: [
            whereClause.startTime,
            { [Op.gt]: now }
          ]
        };
      } else {
        whereClause.startTime = {
          [Op.gt]: now
        };
      }
    }

    return await Function.findAll({
      where: whereClause,
      include: [
        movieInclude,
        { model: Room, attributes: ['name', 'capacity'] }
      ],
      order: [['startTime', 'ASC']] // Ordenar cronológicamente
    });
  }

  async findById(id) {
    return await Function.findByPk(id);
  }

  async update(id, data) {
    const [updatedRowsCount, updatedRows] = await Function.update(data, {
      where: { id },
      returning: true
    });
    // Si la base de datos es Postgres, `returning: true` devuelve las filas actualizadas.
    // Si no, podemos buscar la función actualizada directamente.
    if (updatedRowsCount > 0 && updatedRows && updatedRows.length > 0) {
      return updatedRows[0];
    }
    return await this.findById(id);
  }

  async delete(id) {
    return await Function.destroy({ where: { id } });
  }
}

module.exports = new FunctionRepository();
