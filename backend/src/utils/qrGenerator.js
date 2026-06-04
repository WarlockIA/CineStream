const crypto = require('crypto');
const QRCode = require('qrcode');

// La llave debe ser de 32 bytes para AES-256-CBC
const SECRET_KEY = process.env.SECRET_KEY || '12345678901234567890123456789012';
const ALGORITHM  = 'aes-256-cbc';

// Opciones de color para el QR de marca CineStream
const QR_OPTIONS_TICKET = {
  errorCorrectionLevel: 'L',       // 'L' = menor densidad de módulos → más fácil de escanear con cualquier cámara
  type: 'image/png',
  quality: 0.95,
  margin: 2,                       // Quiet zone reducida (2 en vez de 4) para aprovechar más espacio visual
  color: {
    dark:  '#000000',              // Negro puro para máximo contraste
    light: '#FFFFFF',              // Fondo blanco
  },
  width: 300,
};

// Opciones más compactas para thumbnails en MyTickets
const QR_OPTIONS_THUMB = {
  ...QR_OPTIONS_TICKET,
  width: 200,
};

class QRGenerator {
  /**
   * Cifra un objeto de ticket y genera una imagen QR en Base64 (AES-256-CBC + SHA-256 hash)
   * @param {Object} ticket - Objeto Ticket de Sequelize
   * @param {'ticket'|'thumb'} size - Tamaño del QR generado
   * @returns {Promise<string>} QR en formato data:image/png;base64,...
   */
  async generateTicketQR(ticket, size = 'ticket') {
    // Payload que se encriptará dentro del QR
    const payload = JSON.stringify({
      ticketId:   ticket.id,
      functionId: ticket.functionId,
      seatNumbers: ticket.seatNumbers,
      type: 'entry',
      // Hash para prevenir adulteraciones — verificado al escanear
      hash: crypto
        .createHash('sha256')
        .update(ticket.id + ticket.transactionId)
        .digest('hex'),
    });

    // Encriptación AES-256-CBC con IV aleatorio
    const iv     = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);

    let encrypted  = cipher.update(payload, 'utf8', 'hex');
        encrypted += cipher.final('hex');

    // IV pegado al inicio del string encriptado (necesario para desencriptar)
    const finalToken = `${iv.toString('hex')}:${encrypted}`;

    try {
      const opts = size === 'thumb' ? QR_OPTIONS_THUMB : QR_OPTIONS_TICKET;
      const qrImageBase64 = await QRCode.toDataURL(finalToken, opts);
      return qrImageBase64;
    } catch (err) {
      throw new Error('Error generando código QR: ' + err.message);
    }
  }

  /**
   * Cifra un objeto de ticket para snacks y genera una imagen QR en Base64
   * @param {Object} ticket - Objeto Ticket de Sequelize
   * @param {'ticket'|'thumb'} size - Tamaño del QR generado
   * @returns {Promise<string>} QR en formato data:image/png;base64,...
   */
  async generateSnacksQR(ticket, size = 'ticket') {
    const payload = JSON.stringify({
      ticketId: ticket.id,
      type: 'snacks',
      hash: crypto
        .createHash('sha256')
        .update(ticket.id + ticket.transactionId)
        .digest('hex'),
    });

    const iv     = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);

    let encrypted  = cipher.update(payload, 'utf8', 'hex');
        encrypted += cipher.final('hex');

    const finalToken = `${iv.toString('hex')}:${encrypted}`;

    try {
      const opts = size === 'thumb' ? QR_OPTIONS_THUMB : QR_OPTIONS_TICKET;
      const qrImageBase64 = await QRCode.toDataURL(finalToken, opts);
      return qrImageBase64;
    } catch (err) {
      throw new Error('Error generando código QR de snacks: ' + err.message);
    }
  }

  /**
   * Descifra el contenido del QR escaneado por el portero
   * @param {string} token - String en formato "ivHex:encryptedHex"
   * @returns {Object} Payload desencriptado
   */
  decryptTicketQR(token) {
    const [ivHex, encryptedText] = token.split(':');
    const iv       = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);

    let decrypted  = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }
}

module.exports = new QRGenerator();
