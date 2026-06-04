const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  soldBy: {
    // Registra al empleado que realizó la venta presencial (POS)
    type: DataTypes.UUID,
    allowNull: true,
  },
  functionId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  seatNumbers: {
    type: DataTypes.JSON, // Array de identificadores de asientos, ej: ["A1", "A2"]
    allowNull: true,
  },
  ticketCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  snacks: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  transactionId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isUsed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  paymentMethod: {
    type: DataTypes.STRING,
    defaultValue: 'card', // 'card', 'QR'
  },
  paymentStatus: {
    type: DataTypes.STRING,
    defaultValue: 'completed', // 'pending', 'completed'
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active', // 'active', 'cancelled'
    allowNull: false,
  },
  isSnacksDelivered: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  }
}, {
  timestamps: true,
  tableName: 'tickets',
});

module.exports = Ticket;
