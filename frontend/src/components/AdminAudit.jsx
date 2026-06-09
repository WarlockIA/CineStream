import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, Search, Filter, Clock, 
  User, Activity, ChevronLeft, ChevronRight,
  Info, AlertTriangle, CheckCircle2, DollarSign, Package
} from 'lucide-react';
import { getAPIUrl } from '../config/api';

const ACTION_CONFIG = {
  CINEMA_SALE_COMPLETED: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: DollarSign, label: 'Venta Cine' },
  SNACK_SALE_COMPLETED: { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Package, label: 'Venta Snack' },
  SHIFT_OPEN: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Clock, label: 'Apertura Turno' },
  SHIFT_CLOSED: { color: 'text-red-400', bg: 'bg-red-500/10', icon: CheckCircle2, label: 'Cierre Turno' },
  PRODUCT_UPDATED: { color: 'text-purple-400', bg: 'bg-purple-500/10', icon: Activity, label: 'Ajuste Inventario' },
  MOVIE_CREATED: { color: 'text-teal-400', bg: 'bg-teal-500/10', icon: Info, label: 'Peli Creada' },
  MOVIE_UPDATED: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', icon: Info, label: 'Peli Editada' },
  MOVIE_TOGGLED: { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Info, label: 'Peli Act/Desact' },
  MOVIE_DELETED: { color: 'text-rose-400', bg: 'bg-rose-500/10', icon: AlertTriangle, label: 'Peli Eliminada' },
  FUNCTION_CREATED: { color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', icon: Info, label: 'Función Creada' },
  FUNCTION_UPDATED: { color: 'text-sky-400', bg: 'bg-sky-500/10', icon: Info, label: 'Función Editada' },
  FUNCTION_DEACTIVATED: { color: 'text-orange-400', bg: 'bg-orange-500/10', icon: AlertTriangle, label: 'Función Inactiva' },
};

export default function AdminAudit() {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 15;

  // Filter states
  const [appliedFilters, setAppliedFilters] = useState({
    action: '',
    startDate: '',
    endDate: '',
    username: ''
  });
  const [tempAction, setTempAction] = useState('');
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  const [tempUsername, setTempUsername] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { action, startDate, endDate, username } = appliedFilters;
      let url = getAPIUrl(`/api/audit?limit=${limit}&offset=${page * limit}`);
      if (action) url += `&action=${encodeURIComponent(action)}`;
      if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
      if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;
      if (username) url += `&username=${encodeURIComponent(username)}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Error loading logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchLogs();
  }, [token, page, appliedFilters]);

  const handleApplyFilters = () => {
    setPage(0);
    setAppliedFilters({
      action: tempAction,
      startDate: tempStartDate,
      endDate: tempEndDate,
      username: tempUsername
    });
  };

  const handleResetFilters = () => {
    setTempAction('');
    setTempStartDate('');
    setTempEndDate('');
    setTempUsername('');
    setPage(0);
    setAppliedFilters({
      action: '',
      startDate: '',
      endDate: '',
      username: ''
    });
  };

  const renderDetails = (log) => {
    const details = log.details || {};
    if (log.action === 'CINEMA_SALE_COMPLETED' || log.action === 'SNACK_SALE_COMPLETED') {
      return (
        <span className="text-slate-400">
          Monto: <strong className="text-emerald-400">Bs. {details.totalPrice}</strong> · 
          Tickets: {details.ticketCount || 0} · 
          ID: {details.transactionId?.slice(-6)}
        </span>
      );
    }
    if (log.action === 'SHIFT_CLOSED') {
      return (
        <span className="text-slate-400">
          Efectivo: <strong className="text-white">Bs. {details.actualCash}</strong> · 
          Diferencia: <strong className={details.discrepancy < 0 ? 'text-red-400' : 'text-emerald-400'}>Bs. {details.discrepancy}</strong>
        </span>
      );
    }
    if (log.action === 'PRODUCT_UPDATED') {
      return (
        <span className="text-slate-400">
          Cambios en: {Object.keys(details.changes || {}).join(', ')}
        </span>
      );
    }
    if (log.action.startsWith('MOVIE_')) {
      if (log.action === 'MOVIE_DELETED') {
        return (
          <span className="text-slate-400">
            Película ID: <strong className="text-white">{log.recordId}</strong>{details.cascade ? ' (Eliminación en cascada)' : ''}
          </span>
        );
      }
      return (
        <span className="text-slate-400">
          Película: <strong className="text-white">{details.title || `ID ${log.recordId}`}</strong>
          {details.is_active !== undefined && ` · Estado: ${details.is_active ? 'Activa' : 'Inactiva'}`}
        </span>
      );
    }
    if (log.action.startsWith('FUNCTION_')) {
      if (log.action === 'FUNCTION_DEACTIVATED') {
        return (
          <span className="text-slate-400">
            Función ID: <strong className="text-white">{log.recordId}</strong> (Desactivada)
          </span>
        );
      }
      return (
        <span className="text-slate-400">
          Función ID: <strong className="text-white">{log.recordId}</strong> · 
          Sala: {details.roomId} · 
          Inicio: {details.startTime ? new Date(details.startTime).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz' }) : 'N/A'}
        </span>
      );
    }
    return <span className="text-slate-500 italic">Sin detalles adicionales</span>;
  };

  return (
    <div className="animate-fade-in pb-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-blue-500" />
            Historial de Auditoría
          </h2>
          <p className="text-slate-500 text-sm mt-1">Registro inmutable de actividades administrativas y ventas</p>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2">
          <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-tighter">Monitoreo Activo</span>
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 mb-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          {/* Action filter */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-2">
              <Filter className="w-3 h-3 text-blue-500" />
              Acción / Categoría
            </label>
            <select
              value={tempAction}
              onChange={(e) => setTempAction(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">Todos</option>
              <option value="CREATE">CREACIONES (CREATE)</option>
              <option value="UPDATE">MODIFICACIONES (UPDATE)</option>
              <option value="DELETE">ELIMINACIONES (DELETE)</option>
              <option value="CINEMA_SALE_COMPLETED">Venta de Boletería</option>
              <option value="SNACK_SALE_COMPLETED">Venta de Dulcería</option>
              <option value="SHIFT_OPEN">Apertura de Turno</option>
              <option value="SHIFT_CLOSED">Cierre de Turno</option>
              <option value="PRODUCT_UPDATED">Modificación Inventario</option>
              <option value="MOVIE_CREATED">Película Creada</option>
              <option value="MOVIE_UPDATED">Película Editada</option>
              <option value="MOVIE_TOGGLED">Película Act/Desact</option>
              <option value="MOVIE_DELETED">Película Eliminada</option>
              <option value="FUNCTION_CREATED">Función Creada</option>
              <option value="FUNCTION_UPDATED">Función Editada</option>
              <option value="FUNCTION_DEACTIVATED">Función Inactiva</option>
            </select>
          </div>

          {/* Date from */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-2">
              <Clock className="w-3 h-3 text-blue-500" />
              Desde
            </label>
            <input
              type="date"
              value={tempStartDate}
              onChange={(e) => setTempStartDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Date to */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-2">
              <Clock className="w-3 h-3 text-blue-500" />
              Hasta
            </label>
            <input
              type="date"
              value={tempEndDate}
              onChange={(e) => setTempEndDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* User filter */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-2">
              <User className="w-3 h-3 text-blue-500" />
              Usuario (Nombre o Email)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar..."
                value={tempUsername}
                onChange={(e) => setTempUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors"
          >
            Limpiar
          </button>
          <button
            onClick={handleApplyFilters}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            <Filter className="w-3.5 h-3.5" />
            Filtrar
          </button>
        </div>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div className="p-6 md:p-8">
          {loading ? (
            <div className="space-y-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="w-10 h-10 bg-slate-800 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-slate-800 rounded w-1/4"></div>
                    <div className="h-4 bg-slate-800 rounded w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center grayscale opacity-50">
              <ShieldCheck className="w-16 h-16 text-slate-700 mb-4" />
              <p className="text-slate-500 font-bold uppercase tracking-widest">No se encontraron registros de auditoría</p>
            </div>
          ) : (
            <div className="relative pl-6 md:pl-8 border-l border-slate-800 space-y-6 ml-2 md:ml-4">
              {logs.map((log) => {
                const config = ACTION_CONFIG[log.action] || { color: 'text-slate-400', bg: 'bg-slate-800', icon: Info, label: log.action };
                const IconComponent = config.icon;
                const isCritical = ['MOVIE_DELETED', 'FUNCTION_DEACTIVATED', 'SHIFT_CLOSED'].includes(log.action);
                return (
                  <div key={log.id} className="relative group transition-all duration-300">
                    {/* Node Dot / Icon */}
                    <div className="absolute -left-[37px] md:-left-[45px] top-1.5 flex items-center justify-center">
                      {isCritical && (
                        <div className="absolute w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-500/20 animate-ping opacity-75" />
                      )}
                      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full ${config.bg} ${config.color} border border-slate-700/50 flex items-center justify-center z-10 transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_currentColor]`}>
                        <IconComponent className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                    </div>

                    {/* Timeline card content */}
                    <div className="ml-4 bg-slate-900/50 hover:bg-slate-800/60 border border-slate-700/50 hover:border-slate-500 backdrop-blur-xl rounded-2xl p-4 md:p-5 transition-all duration-300 shadow-[0_4px_20px_rgb(0,0,0,0.2)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:-translate-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${config.bg} ${config.color} border border-white/5`}>
                            {config.label}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            IP: {log.ipAddress || '0.0.0.0'}
                          </span>
                        </div>
                        <div className="text-slate-500 text-xs font-mono font-bold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-600" />
                          {new Date(log.createdAt).toLocaleString('es-BO', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit', 
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        {/* User info */}
                        <div className="md:col-span-4 flex items-center gap-3 border-slate-800/50 md:border-r md:pr-4">
                          <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-white text-xs font-bold truncate">{log.User?.fullname || 'Sistema'}</span>
                            <span className="text-[10px] text-slate-500 truncate">{log.User?.email || 'N/A'}</span>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="md:col-span-8 text-xs pl-0 md:pl-2">
                          {renderDetails(log)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Mostrando <span className="text-white font-bold">{logs.length}</span> de <span className="text-white font-bold">{total}</span> registros
          </span>
          <div className="flex items-center gap-2">
            <button 
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-xs font-black text-white px-3">Página {page + 1}</span>
            <button 
              disabled={(page + 1) * limit >= total}
              onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
