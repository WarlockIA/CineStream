const userService = require('../services/userService');

class UserController {
  async register(req, res) {
    try {
      const userData = req.body;
      const newUser = await userService.registerUser(userData);

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: newUser
      });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      // Llamamos al servicio de login para validar credenciales y obtener el JWT
      const result = await userService.loginUser(email, password);

      res.status(200).json({
        success: true,
        message: 'Login exitoso',
        data: result // Esto incluirá { user, token }
      });
    } catch (error) {
      // Manejamos errores esperados (ej. 401) y no esperados (500 de servidor)
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        message: statusCode === 500 ? 'Error interno del servidor' : error.message
      });
    }
  }
}

module.exports = new UserController();
