const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true, // null para acciones anónimas si aplica
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false, // Ej: 'SALE_COMPLETED', 'SHIFT_CLOSED', 'INVENTORY_ADJUSTED'
  },
  entity: {
    type: DataTypes.STRING,
    allowNull: true, // Ej: 'Ticket', 'Shift', 'Product'
  },
  entityId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  details: {
    type: DataTypes.JSONB,
    allowNull: true, // Datos adicionales (monto, asientes, etc.)
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  timestamps: true,
  tableName: 'audit_logs',
});

module.exports = AuditLog;
