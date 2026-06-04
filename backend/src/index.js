require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const sequelize = require('./config/database');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const movieRoutes = require('./routes/movieRoutes');
const shiftRoutes = require('./routes/shiftRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

const helmet = require('helmet');
const xss = require('xss-clean');

// Middlewares Globales
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } })); // Protección de headers HTTP
app.use(xss()); // Sanitización contra inyecciones XSS
app.use(cors()); // Permite peticiones desde el frontend (React)
app.use(express.json()); // Parsea los bodies de las peticiones en formato JSON

// Servir archivos estáticos (pósters subidos con Multer)
const path = require('path');
app.use('/public', express.static(path.join(__dirname, '../public')));

// Rutas base
app.use('/api/auth', authRoutes);
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/movies', movieRoutes);
app.use('/api/functions', require('./routes/functionRoutes'));
app.use('/api/screenings', require('./routes/functionRoutes'));
app.use('/screenings', require('./routes/functionRoutes'));
app.use('/api/rooms', require('./routes/roomRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/bookings', require('./routes/ticketRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/shifts', shiftRoutes);
app.use('/api/audit', require('./routes/auditRoutes'));

// Ruta base de prueba (Healthcheck)
app.get('/', (req, res) => {
  res.json({ message: 'Bienvenido a la API de CineStream' });
});


// Sincronización con la base de datos e inicio del servidor
const startServer = async () => {
  try {
    // Autenticar la conexión a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos PostgreSQL establecida con éxito.');

    // Cargar todos los modelos y relaciones antes de sincronizar
    require('./models');

    // Registrar 'CineStreamPass' en el enum premiumTier si no existe
    try {
      await sequelize.query('ALTER TYPE "enum_users_premiumTier" ADD VALUE \'CineStreamPass\';');
      console.log('✅ Agregado CineStreamPass al ENUM premiumTier.');
    } catch (err) {
      // Falla silenciosamente si ya existe, lo cual es correcto
      console.log('ℹ️ ENUM premiumTier ya contiene CineStreamPass o no se pudo agregar.');
    }

    // Sincronizar los modelos con la base de datos
    // { alter: true } actualiza las tablas sin borrar datos existentes (ideal para desarrollo)
    await sequelize.sync({ alter: true });
    console.log('✅ Modelos sincronizados con la base de datos.');

    // Semilla: Inicializar catálogo de snacks y asegurar existencia de productos nuevos como Hot Dog
    const { Product } = require('./models');
    const defaultProducts = [
      { id: 's1', name: 'Combo Mega CineStream', stock: 100, price: 60.0 },
      { id: 's2', name: 'Pipoca Grande (Mantequilla)', stock: 100, price: 35.0 },
      { id: 's3', name: 'Refresco Mediano', stock: 100, price: 15.0 },
      { id: 's4', name: 'Combo Personal', stock: 100, price: 40.0 },
      { id: 's5', name: 'Hot Dog Premium', stock: 100, price: 25.0 },
      { id: 's6', name: 'Combo Nacho / Super', stock: 100, price: 55.0 },
      { id: 's7', name: 'Combo Pareja (Dúo)', stock: 100, price: 80.0 },
      { id: 's8', name: 'Chocolate de Cine', stock: 100, price: 12.0 }
    ];
    for (const prod of defaultProducts) {
      await Product.findOrCreate({
        where: { id: prod.id },
        defaults: prod
      });
      if (prod.id === 's1') {
        await Product.update({ price: 60.0 }, { where: { id: 's1' } });
      }
    }
    console.log('📦 Semilla: Catálogo de Snacks verificado y sincronizado.');

    // Crear servidor HTTP y adjuntar Socket.io
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: '*', // Permitir cualquier origen en dev
        methods: ['GET', 'POST']
      }
    });

    // Exponer io globalmente para usarlo en los controladores
    app.set('io', io);

    // Iniciar manejador de WebSockets
    const seatHandler = require('./sockets/seatHandler');
    seatHandler(io);

    // Levantar el servidor HTTP
    server.listen(PORT, () => {
      console.log(`🚀 Servidor CineStream (HTTP + Sockets) corriendo en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error al inicializar el servidor o conectar a la BD:', error);
  }
};

startServer();
