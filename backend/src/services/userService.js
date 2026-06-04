const userRepository = require('../repositories/userRepository');
const authHelper = require('../utils/authHelper');
const jwt = require('jsonwebtoken');

class UserService {
  async registerUser(userData) {
    const { fullname, email, password, role } = userData;

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      const error = new Error('El correo electrónico ya está registrado.');
      error.statusCode = 400;
      throw error;
    }

    const hashedPassword = await authHelper.encryptPassword(password);

    const newUser = await userRepository.create({
      fullname,
      email,
      password: hashedPassword,
      role: role || 'client',
    });

    const userToReturn = newUser.toJSON();
    delete userToReturn.password;
    
    return userToReturn;
  }

  async loginUser(email, password) {
    // 1. Buscar al usuario por email
    const user = await userRepository.findByEmail(email);
    if (!user) {
      const error = new Error('Credenciales inválidas');
      error.statusCode = 401; // Código HTTP 401 para credenciales incorrectas
      throw error;
    }

    // 2. Comparar la contraseña usando el helper de seguridad
    const isMatch = await authHelper.comparePassword(password, user.password);
    if (!isMatch) {
      const error = new Error('Credenciales inválidas');
      error.statusCode = 401; // Código HTTP 401 para credenciales incorrectas
      throw error;
    }

    // 3. Generar JWT que expire en 8 horas, conteniendo userId y role
    const payload = {
      userId: user.id,
      role: user.role
    };
    
    // Utilizamos process.env.JWT_SECRET (si existe) o un fallback temporal
    const secret = process.env.JWT_SECRET || 'secret_key_temporal';
    const token = jwt.sign(payload, secret, { expiresIn: '8h' });

    // 4. Retornar el token y el usuario (excluyendo password)
    const userToReturn = user.toJSON();
    delete userToReturn.password;

    return {
      user: userToReturn,
      token
    };
  }
}

module.exports = new UserService();
