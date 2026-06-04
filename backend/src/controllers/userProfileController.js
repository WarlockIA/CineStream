const { User, Ticket, Function, Movie, Room, PointTransaction } = require('../models');
const { syncUserPoints } = require('../utils/pointsHelper');
const { logAction } = require('../utils/auditLogger');
const { Op } = require('sequelize');

class UserProfileController {
  async getProfile(req, res) {
    try {
      const userId = req.user.id;

      // Sincronizar puntos activos (procesando expiraciones) antes de retornar el perfil
      await syncUserPoints(userId);

      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }

      // Obtener historial de compras (últimas 10)
      const history = await Ticket.findAll({
        where: { userId },
        include: [{
          model: Function,
          include: [Movie, Room]
        }],
        order: [['createdAt', 'DESC']],
        limit: 10
      });

      // Obtener cupones activos
      const { Coupon } = require('../models');
      const coupons = await Coupon.findAll({
        where: {
          userId,
          isUsed: false,
          [Op.or]: [
            { expiresAt: null },
            { expiresAt: { [Op.gt]: new Date() } }
          ]
        },
        order: [['createdAt', 'DESC']]
      });

      const profileData = user.toJSON();
      profileData.hasUsedPassToday = user.lastPassUsedAt
        ? (new Date(user.lastPassUsedAt).toDateString() === new Date().toDateString())
        : false;

      res.status(200).json({
        success: true,
        data: {
          profile: profileData,
          history,
          coupons
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener el perfil',
        error: error.message
      });
    }
  }

  async subscribePremium(req, res) {
    try {
      const userId = req.user.id;
      const { tier } = req.body;

      if (!['Gold', 'Platinum', 'CineStreamPass'].includes(tier)) {
        return res.status(400).json({ success: false, message: 'El nivel de membresía especificado no es válido.' });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }

      let ticketsGranted = 3;
      if (tier === 'Platinum') ticketsGranted = 5;
      else if (tier === 'CineStreamPass') ticketsGranted = 4;

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30); // 30 días de vigencia

      user.isPremium = true;
      user.premiumTier = tier;
      user.premiumExpiresAt = expiryDate;
      user.premiumTicketsLeft = ticketsGranted;

      await user.save();

      // Auditoría
      if (logAction) {
        await logAction(
          userId,
          'PREMIUM_SUBSCRIBED',
          'User',
          userId,
          { tier, expiresAt: expiryDate, ticketsGranted },
          req
        );
      }

      res.status(200).json({
        success: true,
        message: `¡Te has suscrito exitosamente al Plan Premium ${tier}!`,
        data: {
          profile: {
            id: user.id,
            fullname: user.fullname,
            email: user.email,
            role: user.role,
            points: user.points,
            membershipLevel: user.membershipLevel,
            isPremium: user.isPremium,
            premiumTier: user.premiumTier,
            premiumExpiresAt: user.premiumExpiresAt,
            premiumTicketsLeft: user.premiumTicketsLeft,
            lastPassUsedAt: user.lastPassUsedAt,
            hasUsedPassToday: user.lastPassUsedAt
              ? (new Date(user.lastPassUsedAt).toDateString() === new Date().toDateString())
              : false
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al suscribirse al Plan Premium',
        error: error.message
      });
    }
  }

  async getPointsHistory(req, res) {
    try {
      const userId = req.user.id;

      // Sincronizar expiraciones de puntos
      await syncUserPoints(userId);

      const history = await PointTransaction.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']]
      });

      res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener el historial de puntos',
        error: error.message
      });
    }
  }
}

module.exports = new UserProfileController();
