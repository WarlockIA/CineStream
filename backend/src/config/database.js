const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'cinestream_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432, // <-- Agregamos el puerto aquí
    dialect: 'postgres',
    logging: false, // Cambiar a console.log para ver las consultas SQL en consola
  }
);

module.exports = sequelize;
