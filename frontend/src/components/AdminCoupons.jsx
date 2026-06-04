import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toastSuccess, toastError } from '../utils/toastHelper';
import { Ticket, Search, XCircle, ShieldAlert, Award, Calendar } from 'lucide-react';

export default function AdminCoupons() {
  const { token } = useAuth();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'active' | 'used' | 'expired'

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3000/api/bookings/admin/coupons', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCoupons(res.data.data || []);
    } catch (err) {
      console.error(err);
      toastError('No se pudieron cargar los cupones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [token]);

  const [revokePrompt, setRevokePrompt] = useState(null);

  const executeRevoke = async () => {
    if (!revokePrompt) return;
    const { id, code } = revokePrompt;
    setRevokePrompt(null);
    try {
      await axios.post(`http://localhost:3000/api/bookings/admin/coupons/${id}/revoke`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toastSuccess(`¡Cupón ${code} anulado con éxito!`);
      fetchCoupons();
    } catch (err) {
      toastError(err.response?.data?.message || 'Error al anular el cupón');
    }
  };

  // Filtrado
  const filteredCoupons = coupons.filter(c => {
    // Búsqueda por código o email
    const matchSearch = !search ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.User?.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.User?.fullname?.toLowerCase().includes(search.toLowerCase());

    const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();

    if (filterType === 'active') {
      return matchSearch && !c.isUsed && !isExpired;
    }
    if (filterType === 'used') {
      return matchSearch && c.isUsed;
    }
    if (filterType === 'expired') {
      return matchSearch && !c.isUsed && isExpired;
    }
    return matchSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in" translate="no">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Auditoría de Cupones de Reembolso</h2>
          <p className="text-slate-400 text-sm mt-1">Supervisa y anula los cupones de crédito generados por cancelaciones.</p>
        </div>
        <button
          onClick={fetchCoupons}
          className="btn-secondary text-xs px-4 py-2"
        >
          🔄 Refrescar Lista
        </button>
      </div>

      {/* Barra de Filtros e Búsqueda */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por código o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary"
          />
        </div>

        <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-800">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'active', label: 'Activos' },
            { id: 'used', label: 'Usados' },
            { id: 'expired', label: 'Vencidos' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterType === tab.id
                ? 'bg-brand-primary text-white'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Cupones */}
      {loading ? (
        <div className="bg-slate-900/40 border border-slate-850 rounded-3xl p-12 text-center text-slate-400 animate-pulse">
          Cargando cupones generados...
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="bg-slate-900/30 border border-slate-850 rounded-3xl p-12 text-center text-slate-500 text-sm">
          No se encontraron cupones con los filtros seleccionados.
        </div>
      ) : (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-955 border-b border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-5">Código</th>
                  <th className="py-4 px-5">Cliente</th>
                  <th className="py-4 px-5">Valor</th>
                  <th className="py-4 px-5">Estado</th>
                  <th className="py-4 px-5">Vencimiento</th>
                  <th className="py-4 px-5">Tickets Relacionados</th>
                  <th className="py-4 px-5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
                {filteredCoupons.map((coupon) => {
                  const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
                  return (
                    <tr key={coupon.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-4 px-5 font-mono font-bold text-white">{coupon.code}</td>
                      <td className="py-4 px-5">
                        <div className="font-semibold text-white">{coupon.User?.fullname || 'Anónimo'}</div>
                        <div className="text-xs text-slate-500">{coupon.User?.email || 'N/A'}</div>
                      </td>
                      <td className="py-4 px-5 font-bold text-emerald-400">Bs. {parseFloat(coupon.value).toFixed(2)}</td>
                      <td className="py-4 px-5">
                        {coupon.isUsed ? (
                          coupon.redeemedTicketId ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700/60">
                              Usado
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-950/40 text-red-400 border border-red-900/50">
                              Anulado
                            </span>
                          )
                        ) : isExpired ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
                            Vencido
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
                            Activo
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-xs text-slate-400">
                        {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'Sin expiración'}
                      </td>
                      <td className="py-4 px-5 text-xs">
                        <div className="flex flex-col gap-1">
                          {coupon.originTicketId && (
                            <span className="text-red-400">
                              Origen: <span className="font-mono">{coupon.originTicketId.slice(-6).toUpperCase()}</span>
                            </span>
                          )}
                          {coupon.redeemedTicketId && (
                            <span className="text-emerald-400">
                              Redimido: <span className="font-mono">{coupon.redeemedTicketId.slice(-6).toUpperCase()}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right">
                        {!coupon.isUsed && !isExpired && (
                          <button
                            onClick={() => setRevokePrompt({ id: coupon.id, code: coupon.code })}
                            className="text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20 transition-all flex items-center gap-1 ml-auto"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Anular
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ANULACIÓN */}
      {revokePrompt && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div
            className="relative bg-slate-900/90 backdrop-blur-2xl border border-red-500/30 rounded-3xl shadow-[0_0_40px_rgba(239,68,68,0.15)] p-8 max-w-md w-full animate-slide-up overflow-hidden"
            style={{ animation: 'slideUp 0.3s ease-out forwards' }}
          >
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-red-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center gap-4 mb-4 text-red-500 relative z-10">
              <ShieldAlert className="w-8 h-8 shrink-0" />
              <h3 className="text-lg font-bold text-white leading-tight">Anular Cupón de Crédito</h3>
            </div>
            <p className="text-slate-350 text-sm mb-6 leading-relaxed">
              ¿Estás seguro de anular/revocar el cupón <strong className="text-white font-mono">{revokePrompt.code}</strong>? El cliente ya no podrá utilizar este saldo para sus compras. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-850">
              <button
                type="button"
                onClick={() => setRevokePrompt(null)}
                className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeRevoke}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-red-600 text-white hover:bg-red-500 hover:shadow-lg hover:shadow-red-500/20 transition-all"
              >
                Confirmar Anulación
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </div>
  );
}
