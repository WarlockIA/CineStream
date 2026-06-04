const { AuditLog } = require('../models');

/**
 * Registra una acción en el log de auditoría
 * @param {string} userId - ID del usuario que realiza la acción
 * @param {string} action - Nombre de la acción (Ej: 'SALE_COMPLETED')
 * @param {string} entity - Modelo afectado (Ej: 'Ticket')
 * @param {string} entityId - ID del registro afectado
 * @param {object} details - Datos adicionales relevantes
 * @param {object} req - Objeto Request (opcional para IP)
 */
const logAction = async (userId, action, entity = null, entityId = null, details = {}, req = null) => {
  try {
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null;
    
    await AuditLog.create({
      userId,
      action,
      entity,
      entityId,
      details,
      ipAddress
    });
  } catch (error) {
    console.error('❌ Error guardando AuditLog:', error);
    // No lanzamos error para no bloquear el flujo principal de la aplicación
  }
};

module.exports = { logAction };
