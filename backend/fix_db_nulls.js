const path = require('path');
require('dotenv').config();
const sequelize = require('./src/config/database');

async function fixDatabase() {
  try {
    const queryInterface = sequelize.getQueryInterface();
    
    console.log('--- Iniciando Reparación de Base de Datos ---');
    console.log('Cambiando functionId a nullable...');
    await queryInterface.changeColumn('tickets', 'functionId', {
      type: 'UUID',
      allowNull: true
    });

    console.log('Cambiando seatNumbers a nullable...');
    await queryInterface.changeColumn('tickets', 'seatNumbers', {
      type: 'JSON',
      allowNull: true
    });

    console.log('✅ Reparación completada exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error reparando la base de datos:', error);
    process.exit(1);
  }
}

fixDatabase();
