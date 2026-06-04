const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Shift = sequelize.define('Shift', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  staffId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  startTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  expectedCash: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  actualCash: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  discrepancy: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'open', // 'open' | 'closed'
  }
}, {
  timestamps: true,
  tableName: 'shifts',
});

module.exports = Shift;
