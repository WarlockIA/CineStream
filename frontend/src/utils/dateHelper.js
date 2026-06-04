/**
 * Convierte una fecha UTC a la zona horaria de Bolivia (America/La_Paz)
 * para asegurar que las funciones se muestren correctamente en la interfaz.
 * 
 * @param {string|Date} utcDate - Fecha y hora en formato UTC
 * @returns {string} Fecha y hora formateada en hora local (Bolivia)
 */
export const formatToBoliviaTime = (utcDate) => {
  if (!utcDate) return '';
  
  const date = new Date(utcDate);
  
  // Opciones de formato para fechas legibles
  const options = {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true // Para formato AM/PM
  };
  
  return new Intl.DateTimeFormat('es-BO', options).format(date);
};

/**
 * Convierte una fecha UTC solo a la hora local (Ej: 14:30)
 */
export const extractBoliviaTime = (utcDate) => {
  if (!utcDate) return '';
  
  const date = new Date(utcDate);
  
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false // Formato militar 24h
  }).format(date);
};

/**
 * Convierte un objeto de fecha o string ISO a un objeto Date cuyas funciones locales (getHours, getMinutes, etc.)
 * representan el tiempo en la zona horaria de Bolivia (UTC-4) sin importar la zona horaria del navegador.
 * 
 * @param {string|Date} dateVal - Fecha original
 * @returns {Date} Objeto Date ajustado
 */
export const getBoliviaDate = (dateVal) => {
  if (!dateVal) return new Date();
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return d;
  
  // Bolivia es UTC-4 (offset fijo)
  // El offset del navegador en ms:
  const browserOffset = d.getTimezoneOffset() * 60000;
  // Desfase de Bolivia (UTC-4) es de -4 horas:
  const boliviaOffset = -4 * 60 * 60 * 1000;
  
  // Para que el local time del Date retornado sea igual al local time de Bolivia:
  // timestamp + browserOffset - 4 horas
  return new Date(d.getTime() + browserOffset + boliviaOffset);
};

/**
 * Convierte un objeto de fecha o string ISO a formato compatible con input datetime-local
 * ("YYYY-MM-DDTHH:mm") en la zona horaria de Bolivia (UTC-4).
 * 
 * @param {string|Date} dateVal - Fecha original
 * @returns {string} String formateado para datetime-local
 */
export const toBoliviaInputString = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  // Restamos 4 horas a la fecha UTC para obtener la representación local de Bolivia en UTC
  const boliviaTime = new Date(d.getTime() - (4 * 60 * 60 * 1000));
  return boliviaTime.toISOString().slice(0, 16);
};

/**
 * Toma una cadena datetime-local (o cualquier string de fecha) y asegura que se envíe
 * como ISO 8601 con el offset explícito de Bolivia (-04:00).
 * 
 * @param {string} localDateTimeStr - Fecha local en formato "YYYY-MM-DDTHH:mm"
 * @returns {string} String ISO con offset de Bolivia
 */
export const toBoliviaISOWithOffset = (localDateTimeStr) => {
  if (!localDateTimeStr) return '';
  // Si ya tiene indicador de zona horaria (Z o +/-XX:XX), lo convertimos al equivalente de Bolivia
  if (localDateTimeStr.includes('Z') || /[+-]\d{2}:?\d{2}$/.test(localDateTimeStr)) {
    const d = new Date(localDateTimeStr);
    const boliviaTime = new Date(d.getTime() - (4 * 60 * 60 * 1000));
    return `${boliviaTime.toISOString().slice(0, 19)}-04:00`;
  }
  // Si no tiene zona horaria (típico de datetime-local), asumimos que es hora de Bolivia y añadimos el offset
  const base = localDateTimeStr.length === 16 ? `${localDateTimeStr}:00` : localDateTimeStr;
  return `${base}-04:00`;
};

