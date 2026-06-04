class PaymentService {
  /**
   * Simula el cobro mediante pasarela
   * @param {number} amount - Monto total a cobrar
   * @param {Array<number>} seatIds - Asientos seleccionados
   * @param {string} token - Token de pago simulado
   * @param {string} cardNumber - Número de tarjeta para simular escenarios
   * @returns {Promise<object>} Resultado de la transacción
   */
  async processPayment(amount, seatIds, token, cardNumber = '') {
    return new Promise((resolve, reject) => {
      // Determinar el escenario según el número de tarjeta (ignorando espacios)
      const cleanedCard = cardNumber.replace(/\s/g, '');
      let scenario = 'success';
      
      if (token === 'tok_verify' || token === 'tok_visa_simulated') {
        scenario = 'success';
      } else if (cleanedCard.endsWith('0000')) {
        scenario = 'rejected';
      } else if (cleanedCard.endsWith('9999')) {
        scenario = 'timeout';
      } else {
        // Probabilidades por defecto si no es una tarjeta específica:
        // 90% éxito, 5% rechazo, 5% timeout
        const rand = Math.random();
        if (rand < 0.05) scenario = 'timeout';
        else if (rand < 0.1) scenario = 'rejected';
      }

      if (scenario === 'timeout') {
        setTimeout(() => {
          const error = new Error('Tiempo de espera agotado en la pasarela de pagos');
          error.status = 504; // Gateway Timeout
          reject(error);
        }, 5000); // Simulamos 5 segundos para que se note el timeout
      } else if (scenario === 'rejected') {
        setTimeout(() => {
          const error = new Error('Tarjeta rechazada por fondos insuficientes o fraude');
          error.status = 402; // Payment Required
          reject(error);
        }, 1500);
      } else {
        // Escenario de éxito
        setTimeout(() => {
          resolve({
            success: true,
            transactionId: `txn_fake_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            message: 'Pago procesado correctamente'
          });
        }, 1500);
      }
    });
  }
}

module.exports = new PaymentService();
