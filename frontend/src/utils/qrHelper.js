import CryptoJS from 'crypto-js';
import QRCode from 'qrcode';

// Debe coincidir EXACTAMENTE con el backend para que el portero pueda desencriptar
const SECRET_KEY = '12345678901234567890123456789012'; 

/**
 * Genera el token encriptado siguiendo la lógica del backend (AES-256-CBC)
 */
const generateEncryptedToken = (ticket, type = 'entry') => {
  const ticketId = ticket.ticketId || ticket.id;
  const functionId = ticket.function?.id || ticket.functionId;
  const transactionId = ticket.transactionId;
  const seatNumbers = ticket.seatNumbers || [];

  // 1. Crear el payload idéntico al backend (hash completo de 64 chars para coincidir con validación del portero)
  const payload = type === 'snacks'
    ? JSON.stringify({
        ticketId,
        type: 'snacks',
        hash: CryptoJS.SHA256(ticketId + transactionId).toString(CryptoJS.enc.Hex)
      })
    : JSON.stringify({
        ticketId,
        functionId,
        seatNumbers,
        type: 'entry',
        hash: CryptoJS.SHA256(ticketId + transactionId).toString(CryptoJS.enc.Hex)
      });

  // 2. Configurar encriptación (AES-256-CBC)
  const key = CryptoJS.enc.Utf8.parse(SECRET_KEY);
  const iv = CryptoJS.lib.WordArray.random(16);

  const encrypted = CryptoJS.AES.encrypt(payload, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  // 3. Formato final: ivHex:encryptedHex
  return `${iv.toString(CryptoJS.enc.Hex)}:${encrypted.ciphertext.toString(CryptoJS.enc.Hex)}`;
};

/**
 * Genera una imagen QR en Base64 a partir de los datos de un ticket
 */
export const generateTicketQR = async (ticket) => {
  try {
    if (!ticket || (!ticket.ticketId && !ticket.id)) {
      throw new Error('Datos de ticket insuficientes para generar QR');
    }

    const token = generateEncryptedToken(ticket, 'entry');
    
    const qrOptions = {
      errorCorrectionLevel: 'L', // 'L' genera QR menos denso → más fácil de escanear
      type: 'image/png',
      quality: 0.95,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      width: 300,
    };

    const qrBase64 = await QRCode.toDataURL(token, qrOptions);
    return qrBase64;
  } catch (error) {
    console.error('Error en generateTicketQR:', error);
    return null;
  }
};

/**
 * Genera una imagen QR en Base64 a partir de los datos de un ticket para snacks
 */
export const generateSnacksQR = async (ticket) => {
  try {
    if (!ticket || (!ticket.ticketId && !ticket.id)) {
      throw new Error('Datos de ticket insuficientes para generar QR de snacks');
    }

    const token = generateEncryptedToken(ticket, 'snacks');
    
    const qrOptions = {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.95,
      margin: 4,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      width: 300,
    };

    const qrBase64 = await QRCode.toDataURL(token, qrOptions);
    return qrBase64;
  } catch (error) {
    console.error('Error en generateSnacksQR:', error);
    return null;
  }
};
