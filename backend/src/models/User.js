const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  fullname: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('admin', 'client', 'porter', 'staff'),
    allowNull: false,
    defaultValue: 'client', // Por defecto un usuario nuevo será cliente
  },
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  membershipLevel: {
    type: DataTypes.ENUM('Bronce', 'Plata', 'Oro'),
    defaultValue: 'Bronce',
  },
  isPremium: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  premiumTier: {
    type: DataTypes.ENUM('Gold', 'Platinum'),
    allowNull: true,
  },
  premiumExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  premiumTicketsLeft: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  lastPassUsedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  }
}, {
  timestamps: true, // Agrega createdAt y updatedAt automáticamente
  tableName: 'users', // Nombre explícito de la tabla en PostgreSQL
});

module.exports = User;
