import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Ticket, Users, AlertCircle, Calendar, Zap, Package, DollarSign, CheckCircle2 } from 'lucide-react';
import { io } from 'socket.io-client';
import { getAPIUrl, SOCKET_URL } from '../config/api';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
const PIE_COLORS = ['#3b82f6', '#8b5cf6'];

function useDashboardData(token, startDate, endDate) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        let url = getAPIUrl('/api/reports/dashboard');
        if (startDate && endDate) {
          url += `?startDate=${startDate}&endDate=${endDate}`;
        }
        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(response.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Error cargando dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchDashboard();
  }, [token, startDate, endDate]);

  return { data, loading, error };
}

// Skeletons
const SkeletonCard = () => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="h-4 bg-slate-800 rounded w-1/2"></div>
      <div className="h-10 w-10 bg-slate-800 rounded-full"></div>
    </div>
    <div className="h-8 bg-slate-800 rounded w-3/4 mb-2"></div>
    <div className="h-3 bg-slate-800 rounded w-1/4"></div>
  </div>
);

const SkeletonChart = ({ height = "h-80" }) => (
  <div className={`bg-slate-900/50 border border-slate-800 rounded-2xl p-6 w-full animate-pulse flex flex-col justify-between ${height}`}>
    <div className="h-6 bg-slate-800 rounded w-1/3 mb-8"></div>
    <div className="h-full bg-slate-800/50 rounded w-full"></div>
  </div>
);

export default function AdminDashboard() {
  const { token } = useAuth();
  const [liveSales, setLiveSales] = useState([]);
  const [socket, setSocket] = useState(null);

  // Conexión Socket para Live Monitoring
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);
    newSocket.on('sale:new', (sale) => {
      setLiveSales(prev => [sale, ...prev].slice(0, 5)); // Últimas 5 ventas
    });
    return () => newSocket.disconnect();
  }, []);
  
  // Date Picker State (Por defecto últimos 7 días para no ver la base de datos vacía)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const { data, loading, error } = useDashboardData(token, dateRange.start, dateRange.end);

  const handleDateChange = (e) => {
    setDateRange({ ...dateRange, [e.target.name]: e.target.value });
  };

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-2xl flex items-center shadow-lg animate-fade-in mt-6">
        <AlertCircle className="w-6 h-6 mr-3" />
        <p className="font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-10">
      
      {/* Header con Date Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 bg-slate-900/40 backdrop-blur-md p-6 border border-slate-700/50 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden">
        <div className="absolute -left-10 -top-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl" />
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 flex items-center gap-3 tracking-tight relative z-10" style={{ fontFamily: 'Outfit, sans-serif' }}>
          <TrendingUp className="w-8 h-8 text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]" />
          Rendimiento Estratégico
        </h2>
        <div className="flex items-center gap-3 bg-slate-950/60 p-2 border border-slate-700/60 rounded-2xl shadow-inner relative z-10">
          <Calendar className="w-5 h-5 text-slate-400 ml-2" />
          <input 
            type="date" 
            name="start" 
            value={dateRange.start} 
            onChange={handleDateChange} 
            className="bg-transparent text-sm font-semibold text-slate-300 outline-none cursor-pointer hover:text-white transition-colors"
          />
          <span className="text-slate-500 font-black px-1">-</span>
          <input 
            type="date" 
            name="end" 
            value={dateRange.end} 
            onChange={handleDateChange} 
            className="bg-transparent text-sm font-semibold text-slate-300 outline-none cursor-pointer hover:text-white transition-colors mr-2"
          />
        </div>
      </div>

      {loading || !data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonChart height="h-96" /><SkeletonChart height="h-96" />
          </div>
        </>
      ) : (
        <>
          {/* KPI Cards */}
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            
            <div className="group relative overflow-hidden bg-gradient-to-br from-slate-900/80 to-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(16,185,129,0.15)] hover:border-emerald-500/50">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500" />
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Recaudación Total</p>
                  <h3 className="text-4xl font-black text-white tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Bs. {data.kpis.totalRevenue.toLocaleString('es-BO')}
                  </h3>
                </div>
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl shadow-[0_0_15px_rgba(16,185,129,0.2)] group-hover:scale-110 transition-transform duration-500">
                  <TrendingUp className="w-8 h-8" />
                </div>
              </div>
              <p className="text-emerald-400/80 text-xs font-semibold mt-6 relative z-10">En el periodo seleccionado</p>
            </div>

            <div className="group relative overflow-hidden bg-gradient-to-br from-slate-900/80 to-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(59,130,246,0.15)] hover:border-blue-500/50">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-500" />
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Tickets Vendidos</p>
                  <h3 className="text-4xl font-black text-white tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {data.kpis.ticketsSold.toLocaleString('es-BO')}
                  </h3>
                </div>
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl shadow-[0_0_15px_rgba(59,130,246,0.2)] group-hover:scale-110 transition-transform duration-500">
                  <Ticket className="w-8 h-8" />
                </div>
              </div>
              <p className="text-blue-400/80 text-xs font-semibold mt-6 relative z-10">En el periodo seleccionado</p>
            </div>

            <div className="group relative overflow-hidden bg-gradient-to-br from-slate-900/80 to-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(139,92,246,0.15)] hover:border-purple-500/50">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-500" />
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Ocupación Promedio</p>
                  <h3 className="text-4xl font-black text-white tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {data.kpis.averageOccupancy}%
                  </h3>
                </div>
                <div className="p-4 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-2xl shadow-[0_0_15px_rgba(139,92,246,0.2)] group-hover:scale-110 transition-transform duration-500">
                  <Users className="w-8 h-8" />
                </div>
              </div>
              <p className="text-purple-400/80 text-xs font-semibold mt-6 relative z-10">Basado en aforo total</p>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-10">
            {/* Live Sales Monitor (HU-14) */}
            <div className="lg:col-span-1 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-blue-500/30 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] overflow-hidden relative group transition-all duration-500">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
              <div className="absolute top-0 right-0 p-4">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse" />
              </div>
              <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" /> Live Sales Monitor
              </h3>
              <div className="space-y-4">
                {liveSales.length > 0 ? liveSales.map((sale, i) => (
                  <div key={i} className="bg-slate-950/60 hover:bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50 border-l-4 border-l-blue-500/70 hover:border-l-blue-500 transition-all duration-300 animate-in slide-in-from-right-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-bold text-white truncate max-w-[120px] leading-tight">{sale.movieTitle}</p>
                      <p className="text-xs font-black text-emerald-400">Bs. {sale.totalPrice}</p>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-900 px-2 py-0.5 rounded-md">{sale.paymentMethod}</span>
                      <span className="text-[10px] font-bold text-slate-500 font-mono">{new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                )) : (
                  <div className="h-40 flex flex-col items-center justify-center text-center opacity-50">
                    <Zap className="w-10 h-10 text-slate-600 mb-3" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Esperando ventas...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Inventory Alerts (HU-14) */}
            <div className="lg:col-span-3 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
              <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest mb-6 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" /> Alertas de Inventario Crítico
              </h3>
              {data.lowStockProducts && data.lowStockProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.lowStockProducts.map((prod, i) => (
                     <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-[0_4px_20px_rgba(245,158,11,0.1)] transition-transform hover:-translate-y-1 duration-300">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center shadow-inner border border-amber-500/20">
                        <Package className="w-6 h-6 text-amber-500 drop-shadow-md" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-bold leading-tight">{prod.name}</p>
                        <p className="text-amber-500 text-xs mt-1 font-black uppercase tracking-wider">Stock: {prod.stock} uds.</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-4 p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 shadow-[0_4px_20px_rgba(16,185,129,0.1)]">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-emerald-400 text-sm font-black uppercase tracking-wider drop-shadow-sm">Todo en orden</p>
                    <p className="text-slate-400 text-xs font-semibold mt-1">Stock suficiente en todos los productos</p>
                  </div>
                </div>
              )}
            </div>
          </div>


          {/* Gráficas Principales */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            
            {/* Area Chart: Ventas Diarias */}
            <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
              <h3 className="text-xl font-bold text-white mb-8 tracking-tight font-display">Tendencia de Ventas (Bs.)</h3>
              <div className="h-[340px] w-full">
                {data.salesChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.salesChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx={0} dy={6} stdDeviation={8} floodColor="#3b82f6" floodOpacity={0.6}/>
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 13, fontWeight: 600}} axisLine={false} tickLine={false} dy={10} />
                      <YAxis stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 13, fontWeight: 600}} axisLine={false} tickLine={false} dx={-10} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(51, 65, 85, 0.5)', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)' }}
                        itemStyle={{ color: '#38bdf8', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="sales" name="Ingresos" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" filter="url(#glow)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 font-medium">No hay ventas en este periodo.</div>
                )}
              </div>
            </div>

            {/* Pie Chart: Canal de Venta */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
              <h3 className="text-xl font-bold text-white mb-8 tracking-tight font-display">Ventas por Canal</h3>
              <div className="h-[340px] w-full">
                {(data.channelChart[0].value > 0 || data.channelChart[1].value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.channelChart}
                        cx="50%"
                        cy="45%"
                        innerRadius={75}
                        outerRadius={105}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="rgba(15,23,42,0.8)"
                        strokeWidth={4}
                      >
                        {data.channelChart.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(51, 65, 85, 0.5)', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)' }}
                        formatter={(value) => [`Bs. ${value}`, '']}
                        itemStyle={{ fontWeight: 'bold' }}
                      />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '13px', fontWeight: '600', color: '#cbd5e1' }} iconType="circle"/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 font-medium">Sin datos registrados.</div>
                )}
              </div>
            </div>

          </div>

          {/* Gráficas Secundarias */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Top 5 Películas */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
              <h3 className="text-xl font-bold text-white mb-8 tracking-tight font-display">Top 5 Películas</h3>
              <div className="h-[340px] w-full">
                {data.topMovies.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.topMovies} layout="vertical" margin={{ top: 10, right: 30, left: 60, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                      <XAxis type="number" stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 13, fontWeight: 600}} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="title" stroke="#64748b" tick={{fill: '#f8fafc', fontSize: 13, fontWeight: 700}} width={120} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{fill: 'rgba(30, 41, 59, 0.5)'}}
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(51, 65, 85, 0.5)', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}
                        itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="revenue" name="Recaudación (Bs)" fill="#10b981" radius={[0, 8, 8, 0]} barSize={28}>
                        {data.topMovies.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 font-medium">Sin taquilla en este periodo.</div>
                )}
              </div>
            </div>

            {/* Rendimiento del Staff */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
              <h3 className="text-xl font-bold text-white mb-8 tracking-tight font-display">Rendimiento Taquilla (Staff)</h3>
              <div className="h-[340px] w-full">
                {data.staffPerformance.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.staffPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="staffName" stroke="#64748b" tick={{fill: '#f8fafc', fontSize: 13, fontWeight: 700}} axisLine={false} tickLine={false} dy={10} />
                      <YAxis stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 13, fontWeight: 600}} axisLine={false} tickLine={false} dx={-10} />
                      <Tooltip 
                        cursor={{fill: 'rgba(30, 41, 59, 0.5)'}}
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(51, 65, 85, 0.5)', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}
                        itemStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="revenue" name="Ventas (Bs)" fill="#f59e0b" radius={[8, 8, 0, 0]} barSize={38} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 font-medium">No hay ventas físicas en este periodo.</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
