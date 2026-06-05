const bcrypt = require('bcryptjs');

/**
 * Helper de autenticación.
 * Siguiendo las directrices de OWASP, se utiliza un factor de trabajo (salt rounds) de 12.
 * Esto proporciona un buen equilibrio entre seguridad (resistencia a ataques de fuerza bruta) 
 * y rendimiento del servidor.
 */
const SALT_ROUNDS = 12;

class AuthHelper {
  /**
   * Encripta una contraseña en texto plano.
   * @param {string} password - Contraseña en texto plano.
   * @returns {Promise<string>} - Hash generado.
   */
  async encryptPassword(password) {
    if (!password) {
      throw new Error('La contraseña es obligatoria para la encriptación.');
    }
    return await bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Compara una contraseña en texto plano con un hash seguro.
   * Previniendo posibles ataques de timing u omitiendo fallos por variables vacías.
   * @param {string} plain - Contraseña proporcionada por el usuario.
   * @param {string} hash - Hash almacenado en la base de datos.
   * @returns {Promise<boolean>} - True si coinciden.
   */
  async comparePassword(plain, hash) {
    if (!plain || !hash) {
      return false; // Retornar false previene errores si faltan datos
    }
    return await bcrypt.compare(plain, hash);
  }
}

module.exports = new AuthHelper();
