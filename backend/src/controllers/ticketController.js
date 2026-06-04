const { sequelize, Ticket, Function, Product, Movie, Room, Coupon, User, PointTransaction } = require('../models');
const paymentService = require('../services/paymentService');
// emailService eliminado de HU-10: ticket centralizado en UI
const qrGenerator = require('../utils/qrGenerator');
const crypto = require('crypto');
const { syncUserPoints, deductPointsFIFO } = require('../utils/pointsHelper');

class TicketController {
  async purchaseTicket(req, res) {
    const { 
      functionId, 
      seatNumbers, 
      snacks, 
      totalPrice, 
      paymentToken, 
      cardNumber, 
      paymentMethod, 
      couponCode,
      usePremiumTickets,
      usePointsForTickets,
      redeemSnacks
    } = req.body;
    const userId = req.user.id; // Asumiendo que viene del token JWT (checkRole/authMiddleware)

    const isSnackOnly = (!functionId && (!seatNumbers || seatNumbers.length === 0) && snacks && snacks.length > 0);

    if (isSnackOnly) {
      if (!totalPrice) {
        return res.status(400).json({ success: false, message: 'Faltan datos obligatorios para la compra de confitería' });
      }
    } else {
      if (!functionId || !seatNumbers || seatNumbers.length === 0 || !totalPrice) {
        return res.status(400).json({ success: false, message: 'Faltan datos obligatorios para la compra' });
      }
    }

    // Iniciar transacción de Sequelize
    const transaction = await sequelize.transaction();

    try {
      // 0. Cargar el registro del usuario para evaluar membresía y puntos
      const userRecord = await User.findByPk(userId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!userRecord) {
        throw new Error('Usuario no encontrado');
      }

      // 1. Verificar existencia de la función (solo si no es snack-only)
      let functionRecord = null;
      if (!isSnackOnly) {
        functionRecord = await Function.findByPk(functionId, {
          include: [{ model: Movie }, { model: Room }],
          transaction
        });
        if (!functionRecord) {
          throw new Error('La función no existe');
        }

        // 2. Verificar que los asientos no hayan sido vendidos previamente
        // Buscamos todos los tickets activos para esta función
        const existingTickets = await Ticket.findAll({
          where: { functionId, status: 'active' },
          transaction,
          lock: transaction.LOCK.UPDATE // Bloqueamos para lectura concurrente
        });

        // Recopilar todos los asientos ya vendidos
        let soldSeats = [];
        existingTickets.forEach(ticket => {
          soldSeats = soldSeats.concat(ticket.seatNumbers);
        });

        // Chequear intersección
        const intersection = seatNumbers.filter(seat => soldSeats.includes(seat));
        if (intersection.length > 0) {
          const conflictError = new Error(`Los asientos ${intersection.join(', ')} ya fueron vendidos`);
          conflictError.status = 409;
          throw conflictError;
        }
      }

      // 2.5 Verificar Stock de Snacks y Descontar con Canjes/Descuentos Premium
      let finalSnacksPrice = 0;
      let snackDiscountRate = 0;
      let processedSnacks = [];

      if (userRecord.isPremium && userRecord.premiumTier) {
        snackDiscountRate = userRecord.premiumTier === 'Gold' ? 0.15 : (userRecord.premiumTier === 'Platinum' ? 0.25 : (userRecord.premiumTier === 'CineStreamPass' ? 0.30 : 0));
      }

      if (snacks && snacks.length > 0) {
        // Clonar para procesar redenciones sin mutar el original
        const snackList = JSON.parse(JSON.stringify(snacks));
        
        // Contar cuántas unidades de cada snack ID queremos canjear
        const redeemCounts = {};
        if (redeemSnacks && Array.isArray(redeemSnacks)) {
          redeemSnacks.forEach(id => {
            redeemCounts[id] = (redeemCounts[id] || 0) + 1;
          });
        }

        let totalRedeemCostPoints = 0;

        for (const snack of snackList) {
          const productRecord = await Product.findByPk(snack.id, {
            transaction,
            lock: transaction.LOCK.UPDATE
          });

          if (!productRecord) {
            throw new Error(`El producto ${snack.name} no existe en el inventario.`);
          }

          if (productRecord.stock < snack.quantity) {
            throw new Error(`Stock insuficiente para ${snack.name}. Solo quedan ${productRecord.stock} unidades.`);
          }

          // Descontar del inventario
          productRecord.stock -= snack.quantity;
          await productRecord.save({ transaction });

          // Procesar canje con puntos si fue solicitado
          const requestedRedeemQty = redeemCounts[snack.id] || 0;
          const actualRedeemQty = Math.min(snack.quantity, requestedRedeemQty);
          
          if (actualRedeemQty > 0) {
            // Refresco (s3) = 30 pts, Pipoca (s2) = 50 pts, Combos/Otros = 80 pts
            let pointsPerUnit = 80;
            if (snack.id === 's3') pointsPerUnit = 30;
            else if (snack.id === 's2') pointsPerUnit = 50;

            totalRedeemCostPoints += actualRedeemQty * pointsPerUnit;
            snack.redeemedQuantity = actualRedeemQty;
          } else {
            snack.redeemedQuantity = 0;
          }

          const chargeableQty = snack.quantity - snack.redeemedQuantity;
          const basePrice = parseFloat(snack.price) * chargeableQty;
          
          // Aplicar descuento de membresía Premium a los snacks no gratis
          const discount = basePrice * snackDiscountRate;
          const snackFinalPrice = basePrice - discount;

          finalSnacksPrice += snackFinalPrice;
          
          processedSnacks.push({
            id: snack.id,
            name: snack.name,
            price: snack.price,
            quantity: snack.quantity,
            redeemedQuantity: snack.redeemedQuantity,
            finalPrice: snackFinalPrice
          });
        }

        // Validar y deducir puntos de confitería
        if (totalRedeemCostPoints > 0) {
          await syncUserPoints(userId, transaction);
          await userRecord.reload({ transaction });

          if (userRecord.points < totalRedeemCostPoints) {
            throw new Error('Puntos insuficientes para canjear los snacks seleccionados.');
          }

          await deductPointsFIFO(userId, totalRedeemCostPoints, transaction);
          console.log(`🍿 Canjeados snacks con ${totalRedeemCostPoints} puntos.`);
        }
      }

      // 2.6 Calcular costo de boletos
      let finalTicketsPrice = 0;
      let premiumTicketsUsed = 0;
      let pointsUsedForTickets = 0;

      if (!isSnackOnly) {
        const ticketPricePerSeat = parseFloat(functionRecord.price);
        if (usePremiumTickets) {
          if (!userRecord.isPremium || userRecord.premiumTicketsLeft <= 0) {
            throw new Error('No tienes boletos premium disponibles.');
          }

          if (userRecord.premiumTier === 'CineStreamPass') {
            const hasUsedToday = userRecord.lastPassUsedAt && new Date(userRecord.lastPassUsedAt).toDateString() === new Date().toDateString();
            if (hasUsedToday) {
              throw new Error('Ya has utilizado tu pase CineStream Pass hoy. Límite: 1 entrada gratis por día.');
            }
            premiumTicketsUsed = 1;
            userRecord.premiumTicketsLeft -= 1;
            userRecord.lastPassUsedAt = new Date();
            await userRecord.save({ transaction });

            finalTicketsPrice = (seatNumbers.length - 1) * ticketPricePerSeat;
            console.log(`🎟️ Usado 1 boleto CineStream Pass. Restante: ${userRecord.premiumTicketsLeft}.`);
          } else {
            premiumTicketsUsed = Math.min(seatNumbers.length, userRecord.premiumTicketsLeft);
            userRecord.premiumTicketsLeft -= premiumTicketsUsed;
            await userRecord.save({ transaction });

            finalTicketsPrice = (seatNumbers.length - premiumTicketsUsed) * ticketPricePerSeat;
            console.log(`🎟️ Usados ${premiumTicketsUsed} boletos premium.`);
          }
        } else if (usePointsForTickets) {
          await syncUserPoints(userId, transaction);
          await userRecord.reload({ transaction });

          const pointsNeeded = seatNumbers.length * 100;
          if (userRecord.points < pointsNeeded) {
            throw new Error('Puntos insuficientes para canjear las entradas.');
          }

          await deductPointsFIFO(userId, pointsNeeded, transaction);
          pointsUsedForTickets = pointsNeeded;
          finalTicketsPrice = 0;
          console.log(`🎟️ Canjeadas ${seatNumbers.length} entradas con ${pointsNeeded} puntos.`);
        } else {
          finalTicketsPrice = seatNumbers.length * ticketPricePerSeat;
        }
      }

      const baseTotalPrice = finalTicketsPrice + finalSnacksPrice;

      // 2.7 Validar y aplicar cupón
      let couponRecord = null;
      let finalPriceToPay = baseTotalPrice;
      let couponDiscount = 0;

      if (couponCode) {
        couponRecord = await Coupon.findOne({
          where: { code: couponCode, userId, isUsed: false },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (!couponRecord) {
          throw new Error('El cupón no es válido, ya fue utilizado o no le pertenece.');
        }

        if (couponRecord.expiresAt && new Date(couponRecord.expiresAt) < new Date()) {
          throw new Error('El cupón proporcionado ha vencido.');
        }

        const couponValue = parseFloat(couponRecord.value);
        if (couponValue >= finalPriceToPay) {
          couponDiscount = finalPriceToPay;
          finalPriceToPay = 0;
        } else {
          couponDiscount = couponValue;
          finalPriceToPay -= couponDiscount;
        }
      }
      console.log('=== DEBUG CHECKOUT ===', {
        baseTotalPrice,
        couponCode,
        couponValue: couponRecord ? parseFloat(couponRecord.value) : null,
        finalPriceToPay
      });

      // 3. Procesar el pago o generar QR
      let transactionId;
      let paymentStatus = 'completed';
      let isQrPayment = false;
      let paymentQrBase64 = null;
      let usedCouponPayment = false;

      if (finalPriceToPay === 0) {
        transactionId = `CPN-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
        paymentStatus = 'completed';
        usedCouponPayment = true;
      } else {
        if (paymentMethod === 'QR') {
          isQrPayment = true;
          paymentStatus = 'pending';
          transactionId = `QR-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

          try {
            const qrcode = require('qrcode');
            paymentQrBase64 = await qrcode.toDataURL(JSON.stringify({
              merchant: 'CineStream - Reserva',
              amount: finalPriceToPay,
              transactionId
            }));
          } catch (qrError) {
            console.error('Error al generar el código QR:', qrError);
            return res.status(500).json({
              success: false,
              message: 'Error al generar el código de pago. Intente de nuevo'
            });
          }
        } else {
          const paymentResult = await paymentService.processPayment(finalPriceToPay, isSnackOnly ? [] : seatNumbers, paymentToken, cardNumber);
          transactionId = paymentResult.transactionId;
        }
      }

      // 4. Crear el Ticket
      const newTicket = await Ticket.create({
        userId: userId,
        soldBy: null,
        functionId: isSnackOnly ? null : functionId,
        seatNumbers: isSnackOnly ? [] : seatNumbers,
        ticketCount: isSnackOnly ? 0 : seatNumbers.length,
        snacks: processedSnacks,
        totalPrice,
        transactionId,
        paymentMethod: finalPriceToPay === 0 
          ? (couponRecord ? 'coupon' : (usePremiumTickets ? 'premium' : (usePointsForTickets ? 'points' : 'free')))
          : (paymentMethod || 'credit_card'),
        paymentStatus: paymentStatus
      }, { transaction });

      // Si se usó cupón, marcarlo como usado y registrar en qué ticket se redimió
      if (couponRecord) {
        couponRecord.isUsed = true;
        couponRecord.redeemedTicketId = newTicket.id;
        await couponRecord.save({ transaction });
      }

      // 4.5 Acumular Puntos (Fidelización)
      if (finalPriceToPay > 0) {
        const earnedPoints = Math.floor(finalPriceToPay / 10);
        if (earnedPoints > 0) {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 180); // 180 días de vigencia (6 meses)

          await PointTransaction.create({
            userId,
            points: earnedPoints,
            type: 'earned',
            description: 'Acumulación por compra de boletos/snacks',
            expiresAt: expiryDate,
            isSpent: false
          }, { transaction });
          console.log(`🎁 Usuario ${userRecord.email} acumuló ${earnedPoints} puntos.`);
        }
      }

      // Sincronizar saldo de puntos final en la misma transacción
      await syncUserPoints(userId, transaction);

      // 5. Commit Transaction
      await transaction.commit();

      // --- Post-Transacción: Generar QR de entrada/snacks si pago completado ---
      let qrBase64 = null;
      let snacksQrBase64 = null;
      if (!isQrPayment) {
        try {
          if (newTicket.seatNumbers && newTicket.seatNumbers.length > 0) {
            qrBase64 = await qrGenerator.generateTicketQR(newTicket);
          }
          if (newTicket.snacks && newTicket.snacks.length > 0) {
            snacksQrBase64 = await qrGenerator.generateSnacksQR(newTicket);
          }
        } catch (postError) {
          console.error('Error al generar QRs:', postError);
        }
      }

      // Emitir evento por socket para actualizar los asientos a 'occupied' en tiempo real
      const io = req.app.get('io');
      if (io) {
        if (!isSnackOnly) {
          seatNumbers.forEach(seat => {
            io.of('/seats').to(`function_${functionId}`).emit('seat:update', {
              functionId,
              seatNumber: seat,
              status: 'occupied'
            });
          });
        }

        // Notificar al Dashboard Administrativo para compras completadas inmediatas (Card, Puntos, Cupón)
        if (!isQrPayment) {
          io.emit('sale:new', {
            transactionId: newTicket.transactionId,
            movieTitle: functionRecord?.Movie?.title || 'Solo Dulcería',
            totalPrice: newTicket.totalPrice,
            paymentMethod: newTicket.paymentMethod,
            createdAt: newTicket.createdAt
          });
        }
      }

      // --- Temporizador de Expiración QR (10 minutos) ---
      if (isQrPayment) {
        setTimeout(async () => {
          try {
            const pendingTicket = await Ticket.findOne({
              where: { transactionId: newTicket.transactionId }
            });

            if (pendingTicket && pendingTicket.paymentStatus === 'pending') {
              console.log(`⏳ Expirando reserva QR para transactionId: ${newTicket.transactionId}`);

              if (pendingTicket.snacks && pendingTicket.snacks.length > 0) {
                for (const snack of pendingTicket.snacks) {
                  const productRecord = await Product.findByPk(snack.id);
                  if (productRecord) {
                    productRecord.stock += snack.quantity;
                    await productRecord.save();
                  }
                }
              }

              if (io && pendingTicket.seatNumbers && pendingTicket.seatNumbers.length > 0) {
                pendingTicket.seatNumbers.forEach(seat => {
                  io.of('/seats').to(`function_${pendingTicket.functionId}`).emit('seat:update', {
                    functionId: pendingTicket.functionId,
                    seatNumber: seat,
                    status: 'free'
                  });
                });
              }

              await pendingTicket.destroy();
            }
          } catch (err) {
            console.error('Error al ejecutar temporizador de expiración de QR:', err);
          }
        }, 10 * 60 * 1000);
      }

      return res.status(200).json({
        success: true,
        message: isQrPayment ? 'QR de cobro generado con éxito' : 'Compra realizada exitosamente',
        data: {
          ticketId: newTicket.id,
          transactionId: newTicket.transactionId,
          qrBase64: qrBase64,
          snacksQrBase64: snacksQrBase64,
          paymentQrBase64: paymentQrBase64,
          isQrPayment: isQrPayment,
          totalPrice: newTicket.totalPrice,
          snacks: newTicket.snacks,
          movieTitle: functionRecord?.Movie?.title || null,
          roomName: functionRecord?.Room?.name || null,
          startTime: functionRecord?.startTime || null,
          seatNumbers: isSnackOnly ? [] : seatNumbers,
          booking: {
            ticketId: newTicket.id,
            transactionId: newTicket.transactionId,
            seatNumbers: isSnackOnly ? [] : seatNumbers,
            totalPrice: newTicket.totalPrice,
            function: functionRecord ? functionRecord.toJSON() : null,
            Function: functionRecord ? functionRecord.toJSON() : null
          }
        }
      });

    } catch (error) {
      // Rollback en caso de cualquier error
      await transaction.rollback();
      const status = error.status || 400;
      return res.status(status).json({
        success: false,
        message: error.message || 'Error al procesar la compra'
      });
    }
  }

  // Obtener tickets de un usuario
  async getUserTickets(req, res) {
    try {
      const tickets = await Ticket.findAll({
        where: { userId: req.user.id, paymentStatus: 'completed' },
        include: [{
          model: Function,
          include: [{ model: Movie }, { model: Room }]
        }],
        order: [['createdAt', 'DESC']]
      });

      // Regenerar QR para cada ticket en memoria
      const ticketsWithQR = await Promise.all(tickets.map(async (ticket) => {
        const hasSeats = ticket.seatNumbers && ticket.seatNumbers.length > 0;
        const hasSnacks = ticket.snacks && ticket.snacks.length > 0;
        const qrBase64 = hasSeats ? await qrGenerator.generateTicketQR(ticket) : null;
        const snacksQrBase64 = hasSnacks ? await qrGenerator.generateSnacksQR(ticket) : null;
        return {
          ...ticket.toJSON(),
          qrBase64,
          snacksQrBase64
        };
      }));

      return res.status(200).json({
        success: true,
        data: ticketsWithQR
      });
    } catch (error) {
      console.error('Error fetching user tickets:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener tus tickets' });
    }
  }

  // Confirmar Pago por QR simulado
  async confirmQrPayment(req, res) {
    const { transactionId } = req.body;
    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'Falta el transactionId' });
    }

    try {
      const ticket = await Ticket.findOne({
        where: { transactionId },
        include: [{
          model: Function,
          include: [{ model: Movie }, { model: Room }]
        }]
      });

      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Reserva no encontrada o el tiempo de pago expiró' });
      }

      if (ticket.paymentStatus === 'completed') {
        return res.status(400).json({ success: false, message: 'Esta reserva ya fue pagada' });
      }

      // Marcar como pagado
      ticket.paymentStatus = 'completed';
      await ticket.save();

      // Generar QR de entrada y retornar
      const qrBase64 = ticket.seatNumbers && ticket.seatNumbers.length > 0 ? await qrGenerator.generateTicketQR(ticket) : null;
      const snacksQrBase64 = ticket.snacks && ticket.snacks.length > 0 ? await qrGenerator.generateSnacksQR(ticket) : null;
      // Email eliminado de HU-10 — ticket centralizado en UI

      // Notificar al Dashboard Administrativo (Live Sales Monitor)
      const io = req.app.get('io');
      if (io) {
        io.emit('sale:new', {
          transactionId: ticket.transactionId,
          movieTitle: ticket.Function?.Movie?.title || 'Cine',
          totalPrice: ticket.totalPrice,
          paymentMethod: ticket.paymentMethod || 'QR',
          createdAt: ticket.updatedAt || new Date()
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Pago confirmado exitosamente',
        data: {
          ticketId: ticket.id,
          transactionId: ticket.transactionId,
          qrBase64,
          snacksQrBase64,
          movieTitle: ticket.Function?.Movie?.title,
          roomName: ticket.Function?.Room?.name,
          startTime: ticket.Function?.startTime,
          seatNumbers: ticket.seatNumbers,
          totalPrice: ticket.totalPrice
        }
      });
    } catch (error) {
      console.error('Error confirming QR payment:', error);
      return res.status(500).json({ success: false, message: 'Error interno al confirmar el pago por QR' });
    }
  }

  // Escanear ticket por parte del portero
  async scanTicket(req, res) {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Token QR no proporcionado' });
    }

    try {
      // 1. Desencriptar el Token
      let payload;
      try {
        payload = qrGenerator.decryptTicketQR(token);
      } catch (decErr) {
        return res.status(400).json({ success: false, message: 'Código QR inválido o corrupto' });
      }

      // Validar tipo de ticket (exclusividad de acceso a sala)
      if (payload.type === 'snacks') {
        return res.status(400).json({ success: false, message: 'Este es un código QR de dulcería, por favor diríjase al CandyBar.' });
      }

      // 2. Buscar el Ticket
      const ticket = await Ticket.findByPk(payload.ticketId, {
        include: [{
          model: Function,
          include: [{ model: Movie }, { model: Room }]
        }]
      });

      if (!ticket) {
        return res.status(404).json({ success: false, message: 'El ticket no existe en la base de datos' });
      }

      // 3. Validar Hash de Seguridad
      const expectedHash = crypto.createHash('sha256').update(ticket.id + ticket.transactionId).digest('hex');
      if (payload.hash !== expectedHash) {
        return res.status(403).json({ success: false, message: 'ALERTA: Código QR adulterado o falso' });
      }

      // 4. Verificar si ya fue usado
      if (ticket.isUsed) {
        return res.status(409).json({ success: false, message: 'Este ticket YA FUE UTILIZADO anteriormente' });
      }

      // 5. Marcar como usado
      ticket.isUsed = true;
      await ticket.save();

      // 6. Retornar éxito e información
      return res.status(200).json({
        success: true,
        message: 'Acceso Permitido',
        data: {
          functionId: ticket.functionId,
          movieTitle: ticket.Function?.Movie?.title,
          roomName: ticket.Function?.Room?.name,
          startTime: ticket.Function?.startTime,
          seatNumbers: ticket.seatNumbers
        }
      });
    } catch (error) {
      console.error('Error escaneando ticket:', error);
      return res.status(500).json({ success: false, message: 'Error interno al procesar el código QR' });
    }
  }

  // Escanear ticket de confitería por parte del staff
  async scanSnacksTicket(req, res) {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Token QR no proporcionado' });
    }

    try {
      // 1. Desencriptar el Token
      let payload;
      try {
        payload = qrGenerator.decryptTicketQR(token);
      } catch (decErr) {
        return res.status(400).json({ success: false, message: 'Código QR inválido o corrupto' });
      }

      // 2. Verificar tipo de ticket
      if (payload.type !== 'snacks') {
        return res.status(400).json({ success: false, message: 'Este es un boleto de sala, no es válido para retirar snacks.' });
      }

      // 3. Buscar el Ticket
      const ticket = await Ticket.findByPk(payload.ticketId);

      if (!ticket) {
        return res.status(404).json({ success: false, message: 'El ticket no existe en la base de datos' });
      }

      // 4. Validar Hash de Seguridad
      const expectedHash = crypto.createHash('sha256').update(ticket.id + ticket.transactionId).digest('hex');
      if (payload.hash !== expectedHash) {
        return res.status(403).json({ success: false, message: 'ALERTA: Código QR adulterado o falso' });
      }

      // 5. Verificar estado de cancelación
      if (ticket.status === 'cancelled') {
        return res.status(400).json({ success: false, message: 'Este ticket ha sido cancelado y reembolsado.' });
      }

      // 6. Verificar si ya fue entregado
      if (ticket.isSnacksDelivered) {
        const deliveredTimeStr = ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString('es-BO') : 'fecha desconocida';
        return res.status(409).json({ success: false, message: `Los snacks de esta compra ya fueron retirados el ${deliveredTimeStr}.` });
      }

      // 7. Marcar como entregado
      ticket.isSnacksDelivered = true;
      await ticket.save();

      // Emitir evento por WebSockets para actualizar en tiempo real
      const io = req.app.get('io');
      if (io) {
        io.emit('snacks:delivered', { ticketId: ticket.id });
      }

      // 8. Retornar éxito e información de los snacks
      return res.status(200).json({
        success: true,
        message: 'Entrega de snacks autorizada con éxito.',
        data: {
          ticketId: ticket.id,
          transactionId: ticket.transactionId,
          snacks: ticket.snacks || []
        }
      });
    } catch (error) {
      console.error('Error escaneando snacks ticket:', error);
      return res.status(500).json({ success: false, message: 'Error interno al procesar el código QR de snacks' });
    }
  }

  // ─── Venta en Taquilla (POS) ───────────────────────────────────────────────
  // Igual que purchaseTicket pero: pago siempre en efectivo, registra staffId,
  // no requiere pasarela de pagos, genera QR inmediatamente.
  async posPurchaseTicket(req, res) {
    const { functionId, seatNumbers, snacks, totalPrice } = req.body;
    // Fix #1: checkRole.js inyecta req.user.id (no req.user.userId)
    const staffId = req.user?.id || req.user?.userId || null;

    // Fix #2: Validación defensiva del cajero
    if (!staffId) {
      return res.status(401).json({
        success: false,
        message: 'No se pudo identificar al cajero. Por favor, cierra sesión y vuelve a ingresar.'
      });
    }

    // Determinar tipo de venta: isSnackOnly si no hay functionId
    const isSnackOnly = req.body.isSnackOnly === true || !functionId;

    if (!isSnackOnly && (!seatNumbers || seatNumbers.length === 0)) {
      return res.status(400).json({ success: false, message: 'Para ventas de cine, debe seleccionar al menos un asiento.' });
    }

    const transaction = await sequelize.transaction();

    try {
      // 1. Verificar función (solo si no es snack‑only)
      let functionRecord = null;
      if (!isSnackOnly) {
        functionRecord = await Function.findByPk(functionId, {
          include: [{ model: Movie }, { model: Room }],
          transaction,
        });
        if (!functionRecord) throw Object.assign(new Error('La función no existe'), { status: 404 });
      }

      // 2. Verificar asientos disponibles
      if (!isSnackOnly) {
        const existingTickets = await Ticket.findAll({
          where: { functionId, status: 'active' },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        const soldSeats = existingTickets.flatMap(t => t.seatNumbers);
        const conflict = seatNumbers.filter(s => soldSeats.includes(s));
        if (conflict.length > 0) {
          throw Object.assign(
            new Error(`Los asientos ${conflict.join(', ')} ya están vendidos`),
            { status: 409 }
          );
        }
      }

      // 3. Descontar stock de snacks
      if (snacks && snacks.length > 0) {
        for (const snack of snacks) {
          const prod = await Product.findByPk(snack.id, { transaction, lock: transaction.LOCK.UPDATE });
          if (!prod) throw new Error(`Producto ${snack.name} no encontrado`);
          if (prod.stock < snack.quantity) throw new Error(`Stock insuficiente para ${snack.name}`);
          prod.stock -= snack.quantity;
          await prod.save({ transaction });
        }
      }

      // 4. Crear ticket POS (pago en efectivo, completado inmediatamente)
      const transactionId = `POS-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      const newTicket = await Ticket.create({
        userId: null,          // Venta anónima (por ahora)
        soldBy: staffId,       // Registra el staff como responsable (auditoría)
        functionId: isSnackOnly ? null : functionId,
        seatNumbers: isSnackOnly ? [] : seatNumbers,
        ticketCount: isSnackOnly ? 0 : seatNumbers.length,
        snacks: snacks || [],
        totalPrice,
        transactionId,
        paymentMethod: req.body.paymentMethod || 'cash', // Soporta cash, qr, card
        paymentStatus: 'completed',
      }, { transaction });

      await transaction.commit();

      // 5. Re-obtener la función con asociaciones FUERA de la transacción
      // Esto garantiza que Movie y Room estén disponibles para el ticket
      let freshFunction = null;
      if (!isSnackOnly && functionId) {
        freshFunction = await Function.findByPk(functionId, {
          include: [{ model: Movie }, { model: Room }],
        });
      }

      // 6. Generar QRs (para todas las ventas de POS)
      let qrBase64 = null;
      let snacksQrBase64 = null;
      try {
        if (!isSnackOnly && seatNumbers && seatNumbers.length > 0) {
          qrBase64 = await qrGenerator.generateTicketQR(newTicket);
        }
        if (newTicket.snacks && newTicket.snacks.length > 0) {
          snacksQrBase64 = await qrGenerator.generateSnacksQR(newTicket);
        }
      } catch (qrErr) {
        console.error('Error generando QRs POS:', qrErr);
      }

      // 7. Notificar asientos ocupados y Venta Nueva en tiempo real
      const io = req.app.get('io');
      if (io) {
        if (!isSnackOnly) {
          seatNumbers.forEach(seat => {
            io.of('/seats').to(`function_${functionId}`).emit('seat:update', {
              functionId, seatNumber: seat, status: 'occupied',
            });
          });
        }
        // Notificar al Dashboard Administrativo (Live Sales Monitor)
        io.emit('sale:new', {
          transactionId,
          movieTitle: isSnackOnly ? 'Dulcería' : (freshFunction?.Movie?.title || 'Cine'),
          totalPrice,
          paymentMethod: req.body.paymentMethod || 'cash',
          createdAt: new Date()
        });
      }

      // 8. Registrar en Auditoría
      const { logAction } = require('../utils/auditLogger');
      await logAction(
        staffId, 
        isSnackOnly ? 'SNACK_SALE_COMPLETED' : 'CINEMA_SALE_COMPLETED',
        'Ticket',
        newTicket.id,
        { totalPrice, transactionId, isSnackOnly, snacks: snacks?.length || 0 },
        req
      );

      const functionJson = freshFunction ? freshFunction.toJSON() : null;

      return res.status(200).json({
        success: true,
        message: 'Venta en taquilla procesada exitosamente',
        data: {
          ticketId: newTicket.id,
          transactionId,
          qrBase64,
          snacksQrBase64,
          staffId,
          totalPrice:  newTicket.totalPrice,
          snacks:      newTicket.snacks || [],
          isSnackOnly,
          // Campos planos para extracción directa en el frontend
          movieTitle:  isSnackOnly ? 'Venta de Dulcería' : (functionJson?.Movie?.title || 'Sin título'),
          roomName:    isSnackOnly ? 'Taquilla' : (functionJson?.Room?.name || 'Sala'),
          startTime:   isSnackOnly ? newTicket.createdAt : (functionJson?.startTime || newTicket.createdAt),
          seatNumbers: isSnackOnly ? [] : seatNumbers,
          // Estructura booking completa para el boleto digital
          booking: isSnackOnly ? null : {
            ...newTicket.toJSON(),
            seatNumbers: seatNumbers,         // asegurar que no quede vacío
            function:  functionJson,
            Function:  functionJson,
          }
        },
      });


    } catch (error) {
      if (transaction) {
        try { await transaction.rollback(); } catch (_) { }
      }
      // Extraer el mensaje más útil de errores de Sequelize
      const seqMsg = error.errors?.[0]?.message;
      const message = seqMsg || error.message || 'Error interno en el servidor POS';
      console.error('CRITICAL POS ERROR:', message, error);
      return res.status(error.status || 500).json({
        success: false,
        message,
      });
    }
  }

  // Cancelar ticket y generar cupón
  async cancelTicket(req, res) {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
      const ticket = await Ticket.findByPk(id, {
        include: [{
          model: Function,
          include: [{ model: Movie }, { model: Room }]
        }]
      });

      if (!ticket) {
        return res.status(404).json({ success: false, message: 'El ticket no existe' });
      }

      // Validar propiedad del ticket (si no es admin)
      if (ticket.userId !== userId && userRole !== 'admin') {
        return res.status(403).json({ success: false, message: 'No tienes autorización para cancelar este ticket' });
      }

      if (ticket.status === 'cancelled') {
        return res.status(400).json({ success: false, message: 'Este ticket ya ha sido cancelado anteriormente' });
      }

      if (ticket.isUsed) {
        return res.status(400).json({ success: false, message: 'No se puede cancelar un ticket que ya fue utilizado' });
      }

      if (ticket.isSnacksDelivered) {
        return res.status(400).json({ success: false, message: 'No se puede cancelar un boleto cuyos snacks ya fueron entregados.' });
      }

      // Validar la vigencia del ticket y la regla de las 2 horas (solo si no es compra de solo confitería)
      const isSnackOnly = !ticket.functionId;
      if (!isSnackOnly) {
        if (!ticket.Function) {
          return res.status(400).json({ success: false, message: 'La función asociada al ticket no existe o fue eliminada' });
        }

        const startTimeMs = new Date(ticket.Function.startTime).getTime();
        const nowMs = Date.now();
        const twoHoursMs = 2 * 60 * 60 * 1000;

        if (startTimeMs - nowMs < twoHoursMs) {
          return res.status(400).json({ 
            success: false, 
            message: 'Las cancelaciones y devoluciones solo se permiten hasta 2 horas antes del inicio de la función.' 
          });
        }
      }

      // Iniciar transacción de Sequelize
      const transaction = await sequelize.transaction();

      try {
        // 1. Cambiar estado del ticket
        ticket.status = 'cancelled';
        await ticket.save({ transaction });

        // 2. Devolver stock de snacks
        if (ticket.snacks && ticket.snacks.length > 0) {
          for (const snack of ticket.snacks) {
            const product = await Product.findByPk(snack.id, {
              transaction,
              lock: transaction.LOCK.UPDATE
            });
            if (product) {
              product.stock += snack.quantity;
              await product.save({ transaction });
            }
          }
        }

        // 3. Restar puntos de fidelidad
        const ticketOwner = await User.findByPk(ticket.userId, { transaction });
        if (ticketOwner) {
          const pointsToDeduct = Math.floor(parseFloat(ticket.totalPrice) / 10);
          ticketOwner.points = Math.max(0, ticketOwner.points - pointsToDeduct);
          
          // Re-evaluar nivel de membresía
          if (ticketOwner.points > 1000) ticketOwner.membershipLevel = 'Oro';
          else if (ticketOwner.points > 500) ticketOwner.membershipLevel = 'Plata';
          else ticketOwner.membershipLevel = 'Bronce';

          await ticketOwner.save({ transaction });
        }

        // 4. Generar cupón de crédito digital
        // Código aleatorio de 8 caracteres CS-XXXXXX
        const codeChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let couponCode = '';
        for (let i = 0; i < 6; i++) {
          couponCode += codeChars.charAt(Math.floor(Math.random() * codeChars.length));
        }
        const finalCode = `CS-${couponCode}`;

        // Vencimiento de 30 días
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const newCoupon = await Coupon.create({
          code: finalCode,
          value: ticket.totalPrice,
          userId: ticket.userId,
          originTicketId: ticket.id,
          expiresAt
        }, { transaction });

        await transaction.commit();

        // 5. Liberar las butacas vía Sockets
        const io = req.app.get('io');
        if (io && ticket.seatNumbers && ticket.seatNumbers.length > 0) {
          ticket.seatNumbers.forEach(seat => {
            io.of('/seats').to(`function_${ticket.functionId}`).emit('seat:update', {
              functionId: ticket.functionId,
              seatNumber: seat,
              status: 'free'
            });
          });
        }

        // 6. Registrar en auditoría
        const { logAction } = require('../utils/auditLogger');
        await logAction(
          userId,
          'TICKET_CANCELLED',
          'Ticket',
          ticket.id,
          { totalPrice: ticket.totalPrice, couponCode: finalCode },
          req
        );

        return res.status(200).json({
          success: true,
          message: 'Ticket cancelado con éxito. Se ha generado tu cupón de crédito.',
          data: {
            couponCode: finalCode,
            couponValue: ticket.totalPrice,
            expiresAt
          }
        });

      } catch (err) {
        await transaction.rollback();
        throw err;
      }

    } catch (error) {
      console.error('Error al cancelar el ticket:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error al procesar la cancelación del ticket'
      });
    }
  }

  // Validar y obtener info de un cupón
  async applyCoupon(req, res) {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Código de cupón no proporcionado' });
    }

    try {
      const coupon = await Coupon.findOne({
        where: { code }
      });

      if (!coupon) {
        return res.status(404).json({ success: false, message: 'El cupón no es válido o no existe' });
      }

      if (coupon.userId !== userId) {
        return res.status(403).json({ success: false, message: 'Este cupón no te pertenece' });
      }

      if (coupon.isUsed) {
        return res.status(400).json({ success: false, message: 'Este cupón ya fue utilizado' });
      }

      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return res.status(400).json({ success: false, message: 'Este cupón ha vencido' });
      }

      return res.status(200).json({
        success: true,
        message: 'Cupón válido',
        data: {
          code: coupon.code,
          value: parseFloat(coupon.value)
        }
      });

    } catch (error) {
      console.error('Error al validar cupón:', error);
      return res.status(500).json({ success: false, message: 'Error interno al validar el cupón' });
    }
  }

  // Obtener cupones válidos del usuario autenticado
  async getMyCoupons(req, res) {
    const userId = req.user.id;
    try {
      const { Op } = require('sequelize');
      const coupons = await Coupon.findAll({
        where: {
          userId,
          isUsed: false,
          [Op.or]: [
            { expiresAt: null },
            { expiresAt: { [Op.gt]: new Date() } }
          ]
        },
        order: [['createdAt', 'DESC']]
      });

      return res.status(200).json({
        success: true,
        data: coupons
      });
    } catch (error) {
      console.error('Error fetching user coupons:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener tus cupones' });
    }
  }

  // Obtener todos los cupones (solo admins)
  async getAllCoupons(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Acceso denegado' });
      }

      const UserModel = require('../models/User');
      const coupons = await Coupon.findAll({
        include: [{
          model: UserModel,
          attributes: ['fullname', 'email']
        }],
        order: [['createdAt', 'DESC']]
      });

      return res.status(200).json({
        success: true,
        data: coupons
      });
    } catch (error) {
      console.error('Error fetching all coupons:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener todos los cupones' });
    }
  }

  // Anular cupón (solo admins)
  async revokeCoupon(req, res) {
    const { id } = req.params;
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Acceso denegado' });
      }

      const coupon = await Coupon.findByPk(id);
      if (!coupon) {
        return res.status(404).json({ success: false, message: 'Cupón no encontrado' });
      }

      coupon.isUsed = true;
      await coupon.save();

      return res.status(200).json({
        success: true,
        message: 'Cupón anulado con éxito'
      });
    } catch (error) {
      console.error('Error revoking coupon:', error);
      return res.status(500).json({ success: false, message: 'Error al anular el cupón' });
    }
  }
}

module.exports = new TicketController();
