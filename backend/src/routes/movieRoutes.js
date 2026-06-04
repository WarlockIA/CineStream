const { Router } = require('express');
const { body } = require('express-validator');
const movieController = require('../controllers/movieController');
const checkRole = require('../middlewares/checkRole');
const upload = require('../middlewares/uploadMiddleware'); // <-- Importamos multer

const router = Router();

router.post(
  '/',
  // 1. Middleware de Autorización: Solo Administradores
  checkRole(['admin']),
  // 2. Middleware Multer: Procesa el archivo adjunto con clave 'poster'
  upload.single('poster'),
  // 3. Middlewares de Validación de express-validator
  [
    body('title')
      .notEmpty().withMessage('El título de la película no puede estar vacío.')
      .isString().withMessage('El título debe ser texto.'),
    body('duration')
      .notEmpty().withMessage('La duración no puede estar vacía.')
      .isInt({ min: 1 }).withMessage('La duración debe ser un número entero en minutos mayor a 0.')
  ],
  // 3. Controlador
  movieController.createMovie
);

// Ruta pública para listar todas las películas
router.get('/', movieController.getAllMovies);

// Ruta protegida para eliminar películas
router.delete('/:id', checkRole(['admin']), movieController.deleteMovie);

// Ruta protegida para alternar el estado activo de una película (desactivar/activar)
router.patch('/:id/toggle-active', checkRole(['admin']), movieController.toggleActiveMovie);

// Ruta protegida para actualizar películas
router.put(
  '/:id',
  checkRole(['admin']),
  upload.single('poster'),
  // Se asume validación de campos igual que en POST (simplificado)
  movieController.updateMovie
);

module.exports = router;
