const jwt = require('jsonwebtoken');

/**
 * Middleware para proteger rutas basado en roles.
 * @param {Array<string>} allowedRoles - Array de roles permitidos, ej: ['admin', 'porter']
 */
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // 1. Extraer el token del header Authorization (formato: "Bearer <token>")
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado. Token no proporcionado.'
        });
      }

      const token = authHeader.split(' ')[1];

      // 2. Verificar el token y extraer el payload
      const secret = process.env.JWT_SECRET || 'secret_key_temporal';
      const decoded = jwt.verify(token, secret);

      // 3. Comprobar si el rol del usuario (guardado en el payload del JWT) está permitido
      if (!allowedRoles.includes(decoded.role)) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado. Privilegios insuficientes.'
        });
      }

      // Si todo está bien, inyectamos la info del usuario en la request
      // para que el controlador tenga acceso a req.user (ej. req.user.userId)
      req.user = decoded;
      req.user.id = decoded.userId || decoded.id;
      
      // Continuamos al controlador
      next();
    } catch (error) {
      // Si jwt.verify falla (token expirado, modificado, etc) caerá aquí
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Token inválido o expirado.'
      });
    }
  };
};

module.exports = checkRole;
