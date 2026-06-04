const { sequelize, Room } = require('./src/models');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida.');

    // Insertar salas
    const rooms = [
      { name: 'Sala 1', capacity: 50 },
      { name: 'Sala 2', capacity: 100 }
    ];

    for (const room of rooms) {
      await Room.findOrCreate({
        where: { name: room.name },
        defaults: room
      });
    }

    console.log('Salas insertadas correctamente.');
    process.exit(0);
  } catch (error) {
    console.error('Error al insertar salas:', error);
    process.exit(1);
  }
}

seed();
