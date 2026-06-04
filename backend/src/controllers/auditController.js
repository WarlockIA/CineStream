const { AuditLog, User } = require('../models');
const { Op } = require('sequelize');

class AuditController {
  async getLogs(req, res) {
    try {
      const { limit = 50, offset = 0, action, startDate, endDate, username } = req.query;
      
      const where = {};
      const userWhere = {};

      if (action) {
        if (action === 'CREATE') {
          where.action = {
            [Op.in]: ['SHIFT_OPEN', 'CINEMA_SALE_COMPLETED', 'SNACK_SALE_COMPLETED', 'MOVIE_CREATED', 'FUNCTION_CREATED']
          };
        } else if (action === 'UPDATE') {
          where.action = {
            [Op.in]: ['PRODUCT_UPDATED', 'MOVIE_UPDATED', 'MOVIE_TOGGLED', 'FUNCTION_UPDATED']
          };
        } else if (action === 'DELETE') {
          where.action = {
            [Op.in]: ['MOVIE_TOGGLED', 'FUNCTION_DEACTIVATED', 'MOVIE_DELETED']
          };
        } else {
          where.action = action;
        }
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          const end = new Date(endDate);
          if (endDate.length === 10) {
            end.setHours(23, 59, 59, 999);
          }
          where.createdAt[Op.lte] = end;
        }
      }

      if (username) {
        userWhere[Op.or] = [
          { fullname: { [Op.iLike]: `%${username}%` } },
          { email: { [Op.iLike]: `%${username}%` } }
        ];
      }

      const logs = await AuditLog.findAndCountAll({
        where,
        include: [{
          model: User,
          where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
          required: Object.keys(userWhere).length > 0,
          attributes: ['fullname', 'email']
        }],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.status(200).json({
        success: true,
        data: logs.rows,
        total: logs.count
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener logs de auditoría',
        error: error.message
      });
    }
  }
}

module.exports = new AuditController();
