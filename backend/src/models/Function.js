const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Function = sequelize.define('Function', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  startTime: {
    type: DataTypes.DATE, // Equivale a DATETIME / TIMESTAMP WITH TIME ZONE en Postgres
    allowNull: false,
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  }
}, {
  timestamps: true,
  paranoid: true, // Borrado lógico habilitado
  tableName: 'functions',
});

module.exports = Function;
