const functionService = require('../services/functionService');

class FunctionController {
  async createFunction(req, res) {
    try {
      const newFunction = await functionService.createFunction(req.body);
      
      // Auditoría
      const { logAction } = require('../utils/auditLogger');
      await logAction(
        req.user?.id,
        'FUNCTION_CREATED',
        'Function',
        newFunction.id,
        { startTime: newFunction.startTime, roomId: newFunction.roomId, movieId: newFunction.movieId },
        req
      );

      res.status(201).json({
        success: true,
        message: 'Función registrada exitosamente',
        data: newFunction
      });
    } catch (error) {
      // Si el error tiene status 400 es nuestro error controlado de solapamiento
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Error interno al crear la función'
      });
    }
  }

  async getFunctions(req, res) {
    try {
      // req.query contiene los Query Params: ?date=YYYY-MM-DD & ?movieId=ID
      const functions = await functionService.getFunctions(req.query);
      
      res.status(200).json({
        success: true,
        data: functions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error interno al obtener el catálogo de funciones.',
        error: error.message
      });
    }
  }
  
  async getFunctionById(req, res) {
    try {
      const { id } = req.params;
      const { Function, Movie, Room, Ticket } = require('../models');
      
      const func = await Function.findByPk(id, {
        include: [
          { model: Movie },
          { model: Room }
        ]
      });

      if (!func) {
        return res.status(404).json({ success: false, message: 'Función no encontrada' });
      }

      const tickets = await Ticket.findAll({ where: { functionId: id, status: 'active' } });
      let soldSeats = [];
      tickets.forEach(t => soldSeats = soldSeats.concat(t.seatNumbers));

      const responseData = func.toJSON();
      responseData.soldSeats = soldSeats;

      res.status(200).json({ success: true, data: responseData });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error interno al obtener los detalles de la función.',
        error: error.message
      });
    }
  }

  async updateFunction(req, res) {
    try {
      const { id } = req.params;
      const updatedFunction = await functionService.updateFunction(id, req.body);
      
      // Auditoría
      const { logAction } = require('../utils/auditLogger');
      await logAction(
        req.user?.id,
        'FUNCTION_UPDATED',
        'Function',
        updatedFunction.id,
        { startTime: updatedFunction.startTime, roomId: updatedFunction.roomId, movieId: updatedFunction.movieId },
        req
      );

      res.status(200).json({
        success: true,
        message: 'Función actualizada exitosamente',
        data: updatedFunction
      });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Error interno al actualizar la función'
      });
    }
  }

  async deleteFunction(req, res) {
    try {
      const { id } = req.params;
      await functionService.deleteFunction(id);
      
      // Auditoría
      const { logAction } = require('../utils/auditLogger');
      await logAction(
        req.user?.id,
        'FUNCTION_DEACTIVATED',
        'Function',
        id,
        {},
        req
      );

      res.status(200).json({
        success: true,
        message: 'Función eliminada exitosamente'
      });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Error interno al eliminar la función'
      });
    }
  }

  async getFunctionValidations(req, res) {
    try {
      const { id } = req.params;
      const { Function, Room, Ticket, Movie } = require('../models');

      const func = await Function.findByPk(id, {
        include: [
          { model: Room },
          { model: Movie }
        ]
      });

      if (!func) {
        return res.status(404).json({ success: false, message: 'Función no encontrada' });
      }

      const tickets = await Ticket.findAll({ where: { functionId: id, status: 'active' } });

      let validatedCount = 0;
      let totalSeatsSold = 0;

      tickets.forEach(ticket => {
        const count = Array.isArray(ticket.seatNumbers) ? ticket.seatNumbers.length : (ticket.ticketCount || 0);
        totalSeatsSold += count;
        if (ticket.isUsed) {
          validatedCount += count;
        }
      });

      return res.status(200).json({
        success: true,
        data: {
          functionId: id,
          movieTitle: func.Movie?.title || 'Sin Título',
          roomName: func.Room?.name || 'Sin Sala',
          capacity: func.Room?.capacity || 0,
          validatedCount,
          totalSeatsSold
        }
      });
    } catch (error) {
      console.error('Error al obtener datos de aforo:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno al obtener estadísticas de aforo.',
        error: error.message
      });
    }
  }
}

module.exports = new FunctionController();
