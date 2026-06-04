const { sequelize, Ticket, Function, Movie, Room, User } = require('../models');
const { Op } = require('sequelize');

class ReportController {
  
  // Endpoint principal del Dashboard Estratégico (HU-14)
  async getDashboardData(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      // 1. Filtro de Fechas Dinámico
      const dateFilter = {};
      if (startDate && endDate) {
        dateFilter.createdAt = {
          [Op.between]: [new Date(`${startDate}T00:00:00.000Z`), new Date(`${endDate}T23:59:59.999Z`)]
        };
      } else {
        // Por defecto: últimos 30 días si no mandan filtro
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        dateFilter.createdAt = { [Op.gte]: thirtyDaysAgo };
      }

      // --- 2. Cálculos Nativos SQL (Alto Rendimiento) ---
      
      // 2.A. KPIs Principales (En una sola consulta)
      // Usamos el nuevo campo ticketCount para evitar deserializar el JSON de asientos.
      const kpisResult = await Ticket.findOne({
        attributes: [
          [sequelize.fn('SUM', sequelize.col('totalPrice')), 'totalRevenue'],
          [sequelize.fn('SUM', sequelize.col('ticketCount')), 'ticketsSold'],
        ],
        where: dateFilter,
        raw: true
      });

      const totalRevenue = parseFloat(kpisResult.totalRevenue || 0);
      const ticketsSold = parseInt(kpisResult.ticketsSold || 0, 10);

      // Ocupación Promedio (Requiere sumar capacidades de las salas usadas)
      const functionsInPeriod = await Function.findAll({
        attributes: ['id'],
        include: [{ model: Room, attributes: ['capacity'] }],
        where: {
          startTime: dateFilter.createdAt // Filtrar funciones de este rango
        }
      });
      
      const totalCapacity = functionsInPeriod.reduce((sum, f) => sum + (f.Room?.capacity || 0), 0);
      const averageOccupancy = totalCapacity > 0 
        ? parseFloat(((ticketsSold / totalCapacity) * 100).toFixed(1)) 
        : 0;

      // 2.B. Ranking Top 5 Películas (GROUP BY película)
      // Como Sequelize es restrictivo con includes y group by anidados, calculamos de manera directa.
      const topMoviesData = await Ticket.findAll({
        attributes: [
          'functionId',
          [sequelize.fn('SUM', sequelize.col('totalPrice')), 'revenue']
        ],
        where: dateFilter,
        group: ['functionId'],
        raw: true
      });

      // Mapear functionId a Movie.title (Podría hacerse todo en SQL crudo, pero esto es seguro y agnóstico)
      const funcIds = topMoviesData.map(t => t.functionId);
      const funcs = await Function.findAll({
        where: { id: funcIds },
        include: [{ model: Movie, attributes: ['title'] }],
        attributes: ['id']
      });

      const movieRevenueMap = {};
      topMoviesData.forEach(ticketGroup => {
        const func = funcs.find(f => f.id === ticketGroup.functionId);
        if (func && func.Movie) {
          const title = func.Movie.title;
          if (!movieRevenueMap[title]) movieRevenueMap[title] = 0;
          movieRevenueMap[title] += parseFloat(ticketGroup.revenue);
        }
      });

      const topMovies = Object.entries(movieRevenueMap)
        .map(([title, revenue]) => ({ title, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);


      // 2.C. Tendencia Diaria de Ventas (Evolución de Ventas)
      const dailySalesData = await Ticket.findAll({
        attributes: [
          [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
          [sequelize.fn('SUM', sequelize.col('totalPrice')), 'sales']
        ],
        where: dateFilter,
        group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
        order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
        raw: true
      });

      // Formatear para Recharts
      const salesChart = dailySalesData.map(record => ({
        name: new Date(record.date).toLocaleDateString('es-BO', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
        sales: parseFloat(record.sales)
      }));


      // 2.D. Comparativa de Canales: Web vs POS
      // Si soldBy es null, es Web. Si tiene UUID, es POS (Taquilla).
      const webSales = await Ticket.sum('totalPrice', { where: { ...dateFilter, soldBy: null } }) || 0;
      const posSales = await Ticket.sum('totalPrice', { where: { ...dateFilter, soldBy: { [Op.not]: null } } }) || 0;
      
      const channelChart = [
        { name: 'App Web (Clientes)', value: parseFloat(webSales) },
        { name: 'Taquilla (POS)', value: parseFloat(posSales) }
      ];


      // 2.E. Rendimiento del Personal (Staff Performance)
      const staffPerformanceData = await Ticket.findAll({
        attributes: [
          'soldBy',
          [sequelize.fn('SUM', sequelize.col('totalPrice')), 'revenue'],
          [sequelize.fn('SUM', sequelize.col('ticketCount')), 'tickets']
        ],
        where: { ...dateFilter, soldBy: { [Op.not]: null } },
        group: ['soldBy'],
        order: [[sequelize.fn('SUM', sequelize.col('totalPrice')), 'DESC']],
        raw: true
      });

      const userIds = staffPerformanceData.map(sp => sp.soldBy);
      const staffUsers = await User.findAll({ where: { id: userIds }, attributes: ['id', 'fullname'], raw: true });
      const userMap = staffUsers.reduce((acc, u) => ({...acc, [u.id]: u.fullname}), {});
      
      const staffPerformance = staffPerformanceData.map(sp => ({
        staffName: userMap[sp.soldBy] || 'Desconocido',
        revenue: parseFloat(sp.revenue),
        tickets: parseInt(sp.tickets, 10)
      }));


      // 2.F. Alertas de Inventario (Bajo Stock < 10)
      const { Product } = require('../models');
      const lowStockProducts = await Product.findAll({
        where: { stock: { [Op.lt]: 10 } },
        attributes: ['name', 'stock'],
        order: [['stock', 'ASC']],
        raw: true
      });

      // 3. Devolver Respuesta
      res.status(200).json({
        success: true,
        data: { 
          kpis: { totalRevenue, ticketsSold, averageOccupancy }, 
          salesChart, 
          topMovies,
          channelChart,
          staffPerformance,
          lowStockProducts // HU-14: Nueva data para alertas
        }
      });

    } catch (error) {
      console.error('Error in getDashboardData:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar las consultas de Business Intelligence',
        error: error.message
      });
    }
  }
}

module.exports = new ReportController();
