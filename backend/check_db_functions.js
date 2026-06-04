const { Function, Movie, Room } = require('./src/models');
const sequelize = require('./src/config/database');

async function checkFunctions() {
  try {
    await sequelize.authenticate();
    const functions = await Function.findAll({
      include: [{ model: Movie }, { model: Room }],
      limit: 5
    });

    console.log('--- Funciones en DB ---');
    functions.forEach(f => {
      console.log(`ID: ${f.id}`);
      console.log(`Movie: ${f.Movie?.title}`);
      console.log(`StartTime: ${f.startTime} (${typeof f.startTime})`);
      console.log('-----------------------');
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkFunctions();
