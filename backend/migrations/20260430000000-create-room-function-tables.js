'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Crear tabla de Salas
    await queryInterface.createTable('rooms', {
      id: { type: Sequelize.UUID, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false },
      capacity: { type: Sequelize.INTEGER, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 2. Modificar tabla de películas para soportar borrado lógico
    await queryInterface.addColumn('movies', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // 3. Crear tabla de Funciones con foráneas
    await queryInterface.createTable('functions', {
      id: { type: Sequelize.UUID, primaryKey: true },
      startTime: { type: Sequelize.DATE, allowNull: false },
      endTime: { type: Sequelize.DATE, allowNull: false },
      price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      movieId: { 
        type: Sequelize.UUID, 
        references: { model: 'movies', key: 'id' },
        onDelete: 'CASCADE',
        allowNull: false
      },
      roomId: { 
        type: Sequelize.UUID, 
        references: { model: 'rooms', key: 'id' },
        onDelete: 'CASCADE',
        allowNull: false
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      deletedAt: { type: Sequelize.DATE, allowNull: true } // Para su propio borrado lógico
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('functions');
    await queryInterface.removeColumn('movies', 'deletedAt');
    await queryInterface.dropTable('rooms');
  }
};
