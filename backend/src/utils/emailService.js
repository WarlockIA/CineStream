const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Configuración para Nodemailer
    // Usamos Ethereal por defecto si no hay vars en .env
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
      port: process.env.EMAIL_PORT || 587,
      auth: {
        user: process.env.EMAIL_USER || 'v3i4f3q2yv6p4a2i@ethereal.email', 
        pass: process.env.EMAIL_PASS || 'J7HkXzP4v8Z1S3Lp5F'
      }
    });
  }

  /**
   * Envía el correo electrónico con el ticket y el QR adjunto
   * @param {string} toEmail - Correo del usuario
   * @param {Object} ticket - Objeto de Ticket
   * @param {string} qrBase64 - Código QR generado en base64
   * @param {Object} functionRecord - Detalles de la función (incluye Película y Sala)
   */
  async sendTicketEmail(toEmail, ticket, qrBase64, functionRecord) {
    try {
      const movieTitle = functionRecord?.Movie?.title || 'Película en CineStream';
      const movieSynopsis = functionRecord?.Movie?.synopsis || 'Disfruta de la mejor experiencia cinematográfica.';
      const roomName = functionRecord?.Room?.name || 'Sala asignada';
      const startTime = functionRecord?.startTime ? new Date(functionRecord.startTime).toLocaleString('es-BO', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Horario asignado';

      const info = await this.transporter.sendMail({
        from: '"CineStream" <no-reply@cinestream.com>',
        to: toEmail,
        subject: `🎬 ¡Tus boletos para ${movieTitle} están listos!`,
        html: `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
            <div style="background-color: #0f172a; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: #38bdf8; margin: 0;">CineStream</h1>
            </div>
            <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: center;">
              <h2 style="color: #333; margin-top: 0;">¡Gracias por tu compra!</h2>
              <p style="color: #666; font-size: 16px;">Tu transacción (<strong>${ticket.transactionId}</strong>) fue procesada exitosamente.</p>
              
              <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: left;">
                <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 20px; text-align: center;">${movieTitle}</h3>
                <p style="margin: 0 0 15px 0; color: #64748b; font-size: 14px; text-align: center; font-style: italic;">"${movieSynopsis}"</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
                <p style="margin: 5px 0; color: #475569;"><strong>📅 Horario:</strong> ${startTime}</p>
                <p style="margin: 5px 0; color: #475569;"><strong>🚪 Sala:</strong> ${roomName}</p>
                <p style="margin: 5px 0; color: #475569;"><strong>💺 Asientos:</strong> ${ticket.seatNumbers.join(', ')}</p>
                <p style="margin: 5px 0; color: #475569;"><strong>💰 Total pagado:</strong> $${ticket.totalPrice}</p>
              </div>

              <div style="margin: 30px 0;">
                <p style="color: #666; margin-bottom: 15px;">Muestra este código QR al portero antes de entrar a la sala:</p>
                <img src="cid:qrCodeImage" alt="Ticket QR Code" style="width: 250px; height: 250px; border: 4px solid #e2e8f0; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />
              </div>
              
              <p style="color: #94a3b8; font-size: 14px;">Por favor, llega 15 minutos antes del inicio de la función.</p>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: 'ticket-qr.png',
            path: qrBase64, // Soporta URI Base64 en el 'path'
            cid: 'qrCodeImage'
          }
        ]
      });

      console.log('✉️ Correo de ticket enviado con éxito. MessageId:', info.messageId);
    } catch (error) {
      console.error('❌ Error enviando el correo:', error);
      throw error; // Lanzamos el error para que el controlador lo atrape (si es necesario)
    }
  }
}

module.exports = new EmailService();
