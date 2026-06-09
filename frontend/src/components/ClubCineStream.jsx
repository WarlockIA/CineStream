import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAPIUrl, getImageUrl, SOCKET_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { toastSuccess, toastError } from '../utils/toastHelper';
import { Award, CreditCard, Gift, ShieldAlert, Sparkles, Zap, Trash2, Calendar, Clock } from 'lucide-react';

export default function ClubCineStream() {
  const { token, user, updateProfile } = useAuth();
  const [pointsHistory, setPointsHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPayModal, setShowPayModal] = useState(null); // 'Gold' | 'Platinum' | null
  const [profile, setProfile] = useState(null);

  // Form de tarjeta para suscripción simulada
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  const fetchProfileAndHistory = async () => {
    setLoading(true);
    try {
      const [profileRes, historyRes] = await Promise.all([
        axios.get(getAPIUrl('/api/users/profile'), {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(getAPIUrl('/api/users/points-history'), {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setProfile(profileRes.data.data.profile);
      setPointsHistory(historyRes.data.data || []);
    } catch (err) {
      console.error(err);
      toastError('No se pudo cargar la información de fidelidad.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchProfileAndHistory();
  }, [token]);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (cardNumber.replace(/\s/g, '').length < 16 || expiry.length < 5 || cvc.length < 3) {
      return toastError('Por favor ingresa datos de tarjeta válidos (simulados).');
    }

    setSubmitting(true);
    try {
      const res = await axios.post(
        getAPIUrl('/api/users/subscribe-premium'),
        { tier: showPayModal },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toastSuccess(res.data.message || `¡Suscripción Premium ${showPayModal} activada!`);
      setShowPayModal(null);
      setCardNumber('');
      setExpiry('');
      setCvc('');

      // Recargar datos
      await fetchProfileAndHistory();

      // Actualizar contexto si es necesario
      if (updateProfile) {
        updateProfile(res.data.data.profile);
      }
    } catch (err) {
      toastError(err.response?.data?.message || 'Error al procesar la suscripción.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-400 animate-pulse">
        Cargando tu Club CineStream...
      </div>
    );
  }

  // Estilos de la tarjeta según membresía o nivel
  const isPremium = profile?.isPremium;
  const premiumTier = profile?.premiumTier;
  const level = profile?.membershipLevel || 'Bronce';

  let cardBgClass = 'from-amber-700 via-amber-800 to-amber-900 border-amber-600/30';
  let levelLabel = 'Socio Bronce';

  if (isPremium) {
    if (premiumTier === 'Gold') {
      cardBgClass = 'from-yellow-500 via-yellow-600 to-yellow-700 border-yellow-400/40 shadow-yellow-500/10';
      levelLabel = 'Premium Gold';
    } else if (premiumTier === 'Platinum') {
      cardBgClass = 'from-indigo-600 via-slate-800 to-purple-700 border-purple-400/40 shadow-purple-500/10';
      levelLabel = 'Premium Platinum';
    } else if (premiumTier === 'CineStreamPass') {
      cardBgClass = 'from-zinc-900 via-slate-950 to-black border-yellow-500/60 shadow-[0_0_25px_rgba(234,179,8,0.25)]';
      levelLabel = 'CineStream Pass';
    }
  } else {
    if (level === 'Plata') {
      cardBgClass = 'from-slate-400 via-slate-500 to-slate-600 border-slate-300/30';
      levelLabel = 'Socio Plata';
    } else if (level === 'Oro') {
      cardBgClass = 'from-yellow-650 via-yellow-700 to-yellow-800 border-yellow-500/30';
      levelLabel = 'Socio Oro';
    }
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12" translate="no">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Club CineStream</h2>
          <p className="text-slate-450 text-sm mt-1">Tu espacio exclusivo de beneficios, membresías y puntos acumulados.</p>
        </div>
        <button
          onClick={fetchProfileAndHistory}
          className="btn-secondary text-xs px-4 py-2 self-start md:self-auto"
        >
          🔄 Actualizar Puntos
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Membresía Card (Left) */}
        <div className="col-span-1 lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-sm relative group">
            {/* Glossy Digital Card */}
            <div className={`relative h-56 rounded-3xl p-6 flex flex-col justify-between text-white overflow-hidden shadow-2xl border bg-gradient-to-br transition-all duration-500 group-hover:scale-[1.02] ${cardBgClass}`}>
              {/* Glossy Overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 opacity-30 pointer-events-none" />

              {/* Glare effect */}
              <div className="absolute -inset-y-12 -inset-x-20 bg-gradient-to-r from-transparent via-white/10 to-transparent rotate-45 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-out" />

              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xs font-extrabold tracking-widest uppercase text-white/70">Membresía Oficial</h3>
                  <p className="text-lg font-black tracking-tight mt-0.5">Cine<span className="text-brand-accent">Stream</span></p>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-black/25 backdrop-blur-md border border-white/10 text-3xs font-extrabold uppercase tracking-wider">
                  {levelLabel}
                </div>
              </div>

              {/* Card Chip & Wireless Icon */}
              <div className="flex items-center gap-3 mt-4 opacity-80">
                <div className="w-10 h-8 rounded-lg bg-gradient-to-r from-yellow-300 to-yellow-500 border border-yellow-250 flex items-center justify-center overflow-hidden shadow">
                  <div className="grid grid-cols-3 gap-0.5 w-6 h-6 opacity-40">
                    {Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-black/60 rounded-2xs" />)}
                  </div>
                </div>
                <svg className="w-6 h-6 text-white/50 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>

              <div className="flex justify-between items-end mt-4">
                <div>
                  <p className="text-[10px] text-white/60 font-mono tracking-wider">Titular</p>
                  <p className="text-sm font-bold truncate max-w-[180px]">{profile?.fullname}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/60 font-mono tracking-wider">Puntos Activos</p>
                  <p className="text-lg font-black text-brand-gold font-mono">{profile?.points} pts</p>
                </div>
              </div>
            </div>
          </div>

          {/* Estadísticas Rápidas */}
          <div className="w-full max-w-sm mt-6 grid grid-cols-2 gap-4">
            <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-2xl text-center">
              <span className="text-3xs text-slate-500 font-extrabold uppercase tracking-wider">Nivel Acumulado</span>
              <p className="text-base font-bold text-white mt-1">{profile?.membershipLevel || 'Bronce'}</p>
            </div>
            <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-2xl text-center">
              <span className="text-3xs text-slate-500 font-extrabold uppercase tracking-wider">
                {profile?.premiumTier === 'CineStreamPass' ? 'Pases del Mes' : 'Tickets Premium'}
              </span>
              <p className="text-base font-bold text-brand-accent mt-1">
                {profile?.isPremium ? `${profile?.premiumTicketsLeft} disponibles` : 'No activo'}
              </p>
              {profile?.premiumTier === 'CineStreamPass' && (
                <span className={`text-[10px] block mt-1 ${profile?.hasUsedPassToday ? 'text-rose-450' : 'text-emerald-400'}`}>
                  {profile?.hasUsedPassToday ? '❌ Usado hoy' : '⚡ Disponible hoy'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Planes Premium (Right) */}
        <div className="col-span-1 lg:col-span-7 space-y-6">
          <div className="bg-slate-900/20 border border-slate-850 rounded-3xl p-6">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-accent" /> Suscripción Premium CineStream
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              Lleva tu experiencia al siguiente nivel. Accede a boletos mensuales gratuitos y descuentos masivos permanentes en confitería.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Plan Gold */}
              <div className={`border rounded-2xl p-5 flex flex-col justify-between transition-all ${isPremium && premiumTier === 'Gold'
                ? 'bg-yellow-500/10 border-yellow-500/30'
                : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                }`}>
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-black text-yellow-400 uppercase tracking-widest">Plan Gold</span>
                    {isPremium && premiumTier === 'Gold' && (
                      <span className="text-5xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full font-black uppercase">Activo</span>
                    )}
                  </div>
                  <div className="text-2xl font-black text-white font-mono mb-4">
                    Bs. 80<span className="text-xs text-slate-500 font-normal">/mes</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-300 mb-6">
                    <li className="flex items-center gap-2">
                      <span className="text-yellow-400">✓</span> 3 Entradas de cine al mes
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-yellow-400">✓</span> 15% Descuento en confitería
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-yellow-400">✓</span> Acumulación de StreamPoints
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPayModal('Gold')}
                  disabled={isPremium}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${isPremium && premiumTier === 'Gold'
                    ? 'bg-yellow-500/10 text-yellow-400 cursor-default border border-yellow-500/25'
                    : isPremium
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
                      : 'bg-yellow-500 hover:bg-yellow-600 text-slate-950 shadow-lg shadow-yellow-500/10'
                    }`}
                >
                  {isPremium && premiumTier === 'Gold' ? 'Plan Activo' : isPremium ? 'Ya tienes un plan' : 'Suscribirse'}
                </button>
              </div>

              {/* Plan Platinum */}
              <div className={`border rounded-2xl p-5 flex flex-col justify-between transition-all ${isPremium && premiumTier === 'Platinum'
                ? 'bg-indigo-500/10 border-indigo-500/30'
                : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                }`}>
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-black text-indigo-400 uppercase tracking-widest">Plan Platinum</span>
                    {isPremium && premiumTier === 'Platinum' && (
                      <span className="text-5xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-black uppercase">Activo</span>
                    )}
                  </div>
                  <div className="text-2xl font-black text-white font-mono mb-4">
                    Bs. 120<span className="text-xs text-slate-500 font-normal">/mes</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-300 mb-6">
                    <li className="flex items-center gap-2">
                      <span className="text-indigo-400">✓</span> 5 Entradas de cine al mes
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-indigo-400">✓</span> 25% Descuento en confitería
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-indigo-400">✓</span> Acumulación acelerada de puntos
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPayModal('Platinum')}
                  disabled={isPremium}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${isPremium && premiumTier === 'Platinum'
                    ? 'bg-indigo-500/10 text-indigo-400 cursor-default border border-indigo-500/25'
                    : isPremium
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
                      : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/10'
                    }`}
                >
                  {isPremium && premiumTier === 'Platinum' ? 'Plan Activo' : isPremium ? 'Ya tienes un plan' : 'Suscribirse'}
                </button>
              </div>

              {/* CineStream Pass */}
              <div className={`border rounded-2xl p-5 flex flex-col justify-between transition-all relative overflow-hidden ${isPremium && premiumTier === 'CineStreamPass'
                ? 'bg-yellow-500/5 border-yellow-500/40 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                }`}>
                <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 text-[8px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-lg flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> EXCLUSIVO
                </div>
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-black text-amber-500 uppercase tracking-widest flex items-center gap-1">
                      CineStream Pass ⚡
                    </span>
                    {isPremium && premiumTier === 'CineStreamPass' && (
                      <span className="text-5xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-black uppercase">Activo</span>
                    )}
                  </div>
                  <div className="text-2xl font-black text-white font-mono mb-4">
                    Bs. 150<span className="text-xs text-slate-500 font-normal">/mes</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-300 mb-6">
                    <li className="flex items-center gap-2">
                      <span className="text-amber-500">✓</span> 4 Entradas de cine al mes
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-amber-500">✓</span> Máximo 1 boleto gratis por día
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-amber-500">✓</span> 30% Descuento en confitería
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-amber-500">✓</span> StreamPoints Acelerados x2
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPayModal('CineStreamPass')}
                  disabled={isPremium}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${isPremium && premiumTier === 'CineStreamPass'
                    ? 'bg-amber-500/10 text-amber-400 cursor-default border border-amber-500/25'
                    : isPremium
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
                      : 'bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-slate-950 shadow-lg shadow-yellow-500/10'
                    }`}
                >
                  {isPremium && premiumTier === 'CineStreamPass' ? 'Plan Activo' : isPremium ? 'Ya tienes un plan' : 'Suscribirse'}
                </button>
              </div>
            </div>         </div>
        </div>

        {isPremium && profile?.premiumExpiresAt && (
          <p className="text-2xs text-slate-500 font-mono mt-4 text-center">
            Membresía activa hasta el: {new Date(profile.premiumExpiresAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* Historial de Puntos */}
      <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-6">
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <Gift className="w-5 h-5 text-brand-primary" /> Historial de Movimientos de Puntos
      </h3>

  {
    pointsHistory.length === 0 ? (
      <div className="text-center py-8 text-slate-500 text-sm">
        No tienes transacciones de puntos registradas aún. ¡Empieza a comprar para acumular!
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-3xs font-extrabold uppercase text-slate-500 tracking-wider">
              <th className="pb-3 px-3">Fecha</th>
              <th className="pb-3 px-3">Concepto</th>
              <th className="pb-3 px-3">Tipo</th>
              <th className="pb-3 px-3 text-right">Puntos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 text-slate-350">
            {pointsHistory.map((tx) => {
              const isPositive = tx.points > 0;
              return (
                <tr key={tx.id} className="hover:bg-slate-900/10 transition-colors">
                  <td className="py-3.5 px-3 font-mono text-2xs">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-3 font-medium text-slate-200">
                    {tx.description}
                  </td>
                  <td className="py-3.5 px-3">
                    {tx.type === 'earned' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Acumulado</span>
                    ) : tx.type === 'redeemed' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20">Canjeado</span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-red-500/10 text-red-400 border border-red-500/20">Vencido</span>
                    )}
                  </td>
                  <td className={`py-3.5 px-3 text-right font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-red-450'
                    }`}>
                    {isPositive ? `+${tx.points}` : tx.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )
  }
      </div >

    {/* MODAL DE COMPRA SIMULADA PREMIUM */ }
  {
    showPayModal && (
      <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
        <form
          onSubmit={handleSubscribe}
          className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 max-w-md w-full animate-slide-up"
          style={{ animation: 'slideUp 0.3s ease-out forwards' }}
        >
          <div className="flex items-center gap-4 mb-4 text-brand-primary">
            <CreditCard className="w-8 h-8 shrink-0" />
            <h3 className="text-lg font-bold text-white leading-tight">Activar Suscripción {showPayModal}</h3>
          </div>

          <p className="text-slate-400 text-xs mb-6">
            Ingresa tus datos de tarjeta simulada para procesar el pago de **Bs. {showPayModal === 'Gold' ? '80.00' : showPayModal === 'Platinum' ? '120.00' : '150.00'}** para tu membresía.
          </p>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-2xs uppercase tracking-wider text-slate-500 font-extrabold block mb-1.5">Número de Tarjeta (Simulado)</label>
              <input
                required
                type="text"
                placeholder="4000 1234 5678 9010"
                value={cardNumber}
                onChange={(e) => {
                  // formateador básico
                  const v = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                  const matches = v.match(/\d{4,16}/g);
                  const match = (matches && matches[0]) || '';
                  const parts = [];
                  for (let i = 0, len = match.length; i < len; i += 4) {
                    parts.push(match.substring(i, i + 4));
                  }
                  if (parts.length > 0) {
                    setCardNumber(parts.join(' '));
                  } else {
                    setCardNumber(v);
                  }
                }}
                className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-2xs uppercase tracking-wider text-slate-500 font-extrabold block mb-1.5">Vencimiento</label>
                <input
                  required
                  type="text"
                  placeholder="MM/YY"
                  maxLength="5"
                  value={expiry}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9/]/g, '');
                    if (v.length === 2 && !v.includes('/')) {
                      setExpiry(v + '/');
                    } else {
                      setExpiry(v);
                    }
                  }}
                  className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-2xs uppercase tracking-wider text-slate-500 font-extrabold block mb-1.5">CVC</label>
                <input
                  required
                  type="password"
                  placeholder="***"
                  maxLength="3"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-850">
            <button
              type="button"
              onClick={() => {
                setShowPayModal(null);
                setCardNumber('');
                setExpiry('');
                setCvc('');
              }}
              className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-brand-primary hover:bg-brand-secondary text-white hover:shadow-lg disabled:opacity-50 transition-all"
            >
              {submitting ? 'Procesando...' : 'Pagar y Suscribirme'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </div >
  );
}
