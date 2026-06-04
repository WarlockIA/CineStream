const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const sequelize = require('../backend/src/config/database');

async function fixDatabase() {
  try {
    const queryInterface = sequelize.getQueryInterface();
    
    console.log('--- Iniciando Reparación de Base de Datos ---');
    console.log('DB Config:', {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      db: process.env.DB_NAME
    });
    
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
