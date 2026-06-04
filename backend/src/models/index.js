const sequelize = require('../config/database');

// Importar modelos
const User = require('./User');
const Movie = require('./Movie');
const Room = require('./Room');
const Function = require('./Function');
const Ticket = require('./Ticket');
const Product = require('./Product');
const Shift = require('./Shift');
const AuditLog = require('./AuditLog');
const Coupon = require('./Coupon');
const PointTransaction = require('./PointTransaction');

// --- Relaciones ---

// Una sala tiene muchas funciones (1:N)
Room.hasMany(Function, { foreignKey: 'roomId' });
Function.belongsTo(Room, { foreignKey: 'roomId' });

// Una película tiene muchas funciones (1:N)
Movie.hasMany(Function, { foreignKey: 'movieId', onDelete: 'CASCADE', hooks: true });
Function.belongsTo(Movie, { foreignKey: 'movieId' });

// Relaciones de Tickets
User.hasMany(Ticket, { foreignKey: 'userId' });
Ticket.belongsTo(User, { foreignKey: 'userId' });

Function.hasMany(Ticket, { foreignKey: 'functionId' });
Ticket.belongsTo(Function, { foreignKey: 'functionId' });

// Relaciones de Turnos (Shift)
User.hasMany(Shift, { foreignKey: 'staffId' });
Shift.belongsTo(User, { foreignKey: 'staffId' });

// Relaciones de Auditoría
User.hasMany(AuditLog, { foreignKey: 'userId' });
AuditLog.belongsTo(User, { foreignKey: 'userId' });

// Relaciones de Cupones
User.hasMany(Coupon, { foreignKey: 'userId' });
Coupon.belongsTo(User, { foreignKey: 'userId' });

Ticket.hasOne(Coupon, { as: 'GeneratedCoupon', foreignKey: 'originTicketId' });
Ticket.hasMany(Coupon, { as: 'UsedCoupons', foreignKey: 'redeemedTicketId' });

// Relaciones de Puntos
User.hasMany(PointTransaction, { foreignKey: 'userId' });
PointTransaction.belongsTo(User, { foreignKey: 'userId' });

// --- Hooks Globales de Relaciones ---

// Borrado Lógico en Cascada: Al borrar lógicamente una Movie, borrar sus funciones lógicamente.
Movie.addHook('afterDestroy', async (movie, options) => {
  await Function.destroy({
    where: { movieId: movie.id },
    transaction: options.transaction // Importante si hay transacciones
  });
});

// Restauración en Cascada (Opcional pero recomendado con paranoid)
Movie.addHook('afterRestore', async (movie, options) => {
  await Function.restore({
    where: { movieId: movie.id },
    transaction: options.transaction
  });
});

module.exports = {
  sequelize,
  User,
  Movie,
  Room,
  Function,
  Ticket,
  Product,
  Shift,
  AuditLog,
  Coupon,
  PointTransaction
};
