const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Movie = sequelize.define('Movie', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  synopsis: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  duration: {
    type: DataTypes.INTEGER, // En minutos
    allowNull: false,
  },
  genre: {
    type: DataTypes.STRING,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('genre');
      if (!rawValue) return [];
      try {
        const parsed = JSON.parse(rawValue);
        return Array.isArray(parsed) ? parsed : [rawValue];
      } catch (e) {
        // Fallback for legacy single-genre strings like "Acción"
        return [rawValue];
      }
    },
    set(value) {
      if (Array.isArray(value)) {
        this.setDataValue('genre', JSON.stringify(value));
      } else if (value) {
        this.setDataValue('genre', JSON.stringify([value]));
      } else {
        this.setDataValue('genre', null);
      }
    }
  },
  rating: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  posterUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  }
}, {
  timestamps: true,
  paranoid: true, // Habilitar borrado lógico
  tableName: 'movies',
});

module.exports = Movie;
