const { PointTransaction, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Sincroniza los puntos del usuario de acuerdo a la vigencia transaccional (FIFO)
 * de sus puntos acumulados.
 */
async function syncUserPoints(userId, transaction = null) {
  try {
    const now = new Date();

    // 1. Buscar transacciones acumuladas ('earned') no gastadas que ya hayan expirado
    const expiredTxList = await PointTransaction.findAll({
      where: {
        userId,
        type: 'earned',
        isSpent: false,
        expiresAt: { [Op.lt]: now }
      },
      transaction
    });

    // 2. Para cada transacción expirada, marcarla como usada (isSpent = true) 
    // y registrar una transacción espejo de tipo 'expired'
    for (const tx of expiredTxList) {
      tx.isSpent = true;
      await tx.save({ transaction });

      await PointTransaction.create({
        userId,
        points: -tx.points,
        type: 'expired',
        description: `Vencimiento de ${tx.points} pts acumulados el ${new Date(tx.createdAt).toLocaleDateString()}`,
        isSpent: true,
        expiresAt: null
      }, { transaction });
    }

    // 3. Sumar todas las transacciones 'earned' activas (no gastadas y no vencidas)
    const activeSum = await PointTransaction.sum('points', {
      where: {
        userId,
        type: 'earned',
        isSpent: false,
        expiresAt: { [Op.gt]: now }
      },
      transaction
    });

    const activePoints = activeSum || 0;

    // 4. Actualizar el campo points en el modelo User
    const user = await User.findByPk(userId, { transaction });
    if (user) {
      user.points = activePoints;
      // Actualizar automáticamente nivel de membresía según sus puntos totales acumulados
      if (user.points > 1000) user.membershipLevel = 'Oro';
      else if (user.points > 500) user.membershipLevel = 'Plata';
      else user.membershipLevel = 'Bronce';

      await user.save({ transaction });
    }

    return activePoints;
  } catch (error) {
    console.error(`Error syncing points for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Deduce puntos del usuario utilizando lógica FIFO (First-In, First-Out)
 * sobre sus transacciones 'earned' activas disponibles.
 */
async function deductPointsFIFO(userId, pointsToDeduct, transaction = null) {
  try {
    const now = new Date();
    let remainingToDeduct = pointsToDeduct;

    // Obtener transacciones activas de forma cronológica (las más antiguas primero)
    const activeEarnedTx = await PointTransaction.findAll({
      where: {
        userId,
        type: 'earned',
        isSpent: false,
        expiresAt: { [Op.gt]: now }
      },
      order: [['createdAt', 'ASC']],
      transaction
    });

    for (const tx of activeEarnedTx) {
      if (remainingToDeduct <= 0) break;

      const availablePoints = tx.points;
      if (availablePoints <= remainingToDeduct) {
        // Consumir esta transacción por completo
        tx.isSpent = true;
        await tx.save({ transaction });
        remainingToDeduct -= availablePoints;
      } else {
        // Consumir parcialmente dividiendo la transacción
        tx.points = availablePoints - remainingToDeduct;
        await tx.save({ transaction });

        // Crear una transacción consumida para mantener el balance y el historial
        await PointTransaction.create({
          userId,
          points: remainingToDeduct,
          type: 'earned',
          description: `${tx.description} (Consumido parcial)`,
          expiresAt: tx.expiresAt,
          isSpent: true
        }, { transaction });

        remainingToDeduct = 0;
      }
    }

    if (remainingToDeduct > 0) {
      throw new Error('Puntos insuficientes para realizar el canje.');
    }

    // Registrar la transacción de redención
    await PointTransaction.create({
      userId,
      points: -pointsToDeduct,
      type: 'redeemed',
      description: `Canje de puntos en compra`,
      isSpent: true,
      expiresAt: null
    }, { transaction });

    // Sincronizar el saldo final del usuario
    await syncUserPoints(userId, transaction);
  } catch (error) {
    console.error(`Error in deductPointsFIFO for user ${userId}:`, error);
    throw error;
  }
}

module.exports = {
  syncUserPoints,
  deductPointsFIFO
};
