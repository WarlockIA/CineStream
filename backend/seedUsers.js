require('dotenv').config();
const sequelize = require('./src/config/database');
const userService = require('./src/services/userService');

const seedUsers = async () => {
  try {
    // Conectar a la BD
    await sequelize.authenticate();
    require('./src/models');
    await sequelize.sync();

    // Crear Admin
    try {
      await userService.registerUser({ 
        fullname: 'Administrador', 
        email: 'admin@cinestream.com', 
        password: 'admin', 
        role: 'admin' 
      });
      console.log('✅ Usuario ADMIN creado (admin@cinestream.com / admin)');
    } catch (e) {
      console.log('El usuario ADMIN ya existe.');
    }

    // Crear Staff (para POS)
    try {
      await userService.registerUser({ 
        fullname: 'Cajero Staff', 
        email: 'staff@cinestream.com', 
        password: 'staff', 
        role: 'staff' 
      });
      console.log('✅ Usuario STAFF creado (staff@cinestream.com / staff)');
    } catch (e) {
      console.log('El usuario STAFF ya existe.');
    }
    
    // Crear Cliente
    try {
      await userService.registerUser({ 
        fullname: 'Cliente Prueba', 
        email: 'cliente@cinestream.com', 
        password: '123', 
        role: 'client' 
      });
      console.log('✅ Usuario CLIENTE creado (cliente@cinestream.com / 123)');
    } catch (e) {
      console.log('El usuario CLIENTE ya existe.');
    }

    console.log('🎉 Usuarios listos para usar.');
    process.exit(0);
  } catch (error) {
    console.error('Error al sembrar usuarios:', error);
    process.exit(1);
  }
};

seedUsers();
