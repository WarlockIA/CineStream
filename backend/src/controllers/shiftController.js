const { Shift, Ticket } = require('../models');
const { Op } = require('sequelize');

class ShiftController {
  // 1. Obtener el turno actual del cajero logueado
  async getCurrentShift(req, res) {
    try {
      const staffId = req.user.userId;
      const shift = await Shift.findOne({
        where: { staffId, status: 'open' },
        order: [['startTime', 'DESC']]
      });

      res.status(200).json({ success: true, data: shift }); // puede ser null
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener turno actual', error: error.message });
    }
  }

  // 2. Abrir un nuevo turno
  async openShift(req, res) {
    try {
      const staffId = req.user.userId;
      
      // Verificar si ya tiene un turno abierto
      const openShift = await Shift.findOne({ where: { staffId, status: 'open' } });
      if (openShift) {
        return res.status(400).json({ success: false, message: 'Ya tienes un turno abierto en curso.' });
      }

      const newShift = await Shift.create({
        staffId,
        startTime: new Date(),
        status: 'open'
      });

      // Auditoría
      const { logAction } = require('../utils/auditLogger');
      await logAction(staffId, 'SHIFT_OPEN', 'Shift', newShift.id, {}, req);

      res.status(201).json({ success: true, message: 'Turno abierto correctamente', data: newShift });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al abrir turno', error: error.message });
    }
  }

  // 3. Obtener resumen detallado del turno (Arqueo en tiempo real)
  async getShiftSummary(req, res) {
    try {
      const staffId = req.user.userId;
      const shift = await Shift.findOne({ where: { staffId, status: 'open' } });
      
      if (!shift) {
        return res.status(404).json({ success: false, message: 'No hay turno abierto' });
      }

      // Obtener todos los tickets vendidos en este turno
      const tickets = await Ticket.findAll({
        where: {
          soldBy: staffId,
          createdAt: { [Op.gte]: shift.startTime }
        }
      });

      // Desglosar por método de pago
      const breakdown = {
        cash: 0,
        qr: 0,
        card: 0,
        total: 0
      };

      tickets.forEach(t => {
        const amount = parseFloat(t.totalPrice);
        const method = t.paymentMethod?.toLowerCase() || 'cash';
        if (breakdown[method] !== undefined) {
          breakdown[method] += amount;
        } else {
          breakdown.cash += amount; // fallback a cash si el método es desconocido
        }
        breakdown.total += amount;
      });

      res.status(200).json({ 
        success: true, 
        data: {
          shift,
          breakdown
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener resumen del turno', error: error.message });
    }
  }

  // 4. Cerrar turno (Arqueo) - Recibe actualCash del frontend
  async closeShift(req, res) {
    try {
      const staffId = req.user.userId;
      const { actualCash } = req.body;

      if (actualCash === undefined || isNaN(parseFloat(actualCash)) || parseFloat(actualCash) < 0) {
        return res.status(400).json({ success: false, message: 'El monto físico en caja es inválido.' });
      }

      const shift = await Shift.findOne({ where: { staffId, status: 'open' } });
      if (!shift) {
        return res.status(404).json({ success: false, message: 'No hay ningún turno abierto.' });
      }

      const tickets = await Ticket.findAll({
        where: {
          soldBy: staffId,
          createdAt: { [Op.gte]: shift.startTime }
        }
      });

      // Calcular solo el efectivo esperado
      const expectedCash = tickets
        .filter(t => (t.paymentMethod?.toLowerCase() || 'cash') === 'cash')
        .reduce((sum, t) => sum + parseFloat(t.totalPrice), 0);
      
      const totalSales = tickets.reduce((sum, t) => sum + parseFloat(t.totalPrice), 0);
      const discrepancy = parseFloat(actualCash) - expectedCash;

      shift.expectedCash = expectedCash;
      shift.actualCash = parseFloat(actualCash);
      shift.discrepancy = discrepancy;
      shift.endTime = new Date();
      shift.status = 'closed';

      await shift.save();

      // Auditoría
      const { logAction } = require('../utils/auditLogger');
      await logAction(staffId, 'SHIFT_CLOSED', 'Shift', shift.id, { actualCash, expectedCash, discrepancy }, req);

      res.status(200).json({
        success: true,
        message: 'Arqueo completado exitosamente',
        data: {
          ...shift.toJSON(),
          totalSales,
          expectedCash
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al cerrar el turno', error: error.message });
    }
  }
}

module.exports = new ShiftController();
