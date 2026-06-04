const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Asegurarse de que el directorio public/posters exista
const uploadDir = path.join(__dirname, '../../public/posters');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Guardar en la carpeta local public/posters/
  },
  filename: function (req, file, cb) {
    // Generar un nombre único usando Date.now() y la extensión original
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtro para aceptar solo imágenes jpg o png
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    // Rechazar archivo
    cb(new Error('Formato de archivo no soportado. Sólo JPG o PNG son permitidos.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // Límite de 5 MB
  }
});

module.exports = upload;
