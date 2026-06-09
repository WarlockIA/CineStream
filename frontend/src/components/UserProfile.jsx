import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAPIUrl, getImageUrl, SOCKET_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import {
  User, Award, Star, History, Ticket,
  ChevronRight, Sparkles, Shield, Gift, ArrowLeft, LogOut, Film
} from 'lucide-react';
import ClubCineStream from './ClubCineStream';

const LEVEL_CONFIG = {
  Bronce: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: Star },
  Plata: { color: 'text-slate-300', bg: 'bg-slate-400/10', border: 'border-slate-400/20', icon: Award },
  Oro: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: Sparkles },
};

export default function UserProfile() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [sheen, setSheen] = useState({ x: 0, y: 0, opacity: 0 });
  const [activeTab, setActiveTab] = useState('profile');
  const { logout } = useAuth();

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((centerY - y) / centerY) * 12; // Max 12 degrees
    const rotateY = ((x - centerX) / centerX) * 12;

    setRotate({ x: rotateX, y: rotateY });

    const sheenX = (x / rect.width) * 100;
    const sheenY = (y / rect.height) * 100;
    setSheen({ x: sheenX, y: sheenY, opacity: 0.45 });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
    setSheen({ x: 0, y: 0, opacity: 0 });
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(getAPIUrl('/api/users/profile'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data.data);
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchProfile();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  const { profile, history, coupons } = data;
  const level = LEVEL_CONFIG[profile.membershipLevel || 'Bronce'];

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col pb-20">
      {/* ── Navbar Premium ── */}
      <nav className="navbar nav-premium flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3 select-none">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 p-0.5 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            <div className="w-full h-full bg-[#070B14] rounded-[9px] flex items-center justify-center">
              <Film className="w-5 h-5 text-blue-500 animate-pulse" />
            </div>
          </div>
          <h1 className="logo-text-premium leading-none">CineStream</h1>
        </div>

        <div className="flex items-center gap-4">
          {profile?.role === 'client' ? (
            <>
              <button onClick={() => navigate('/movies')} className="btn-tickets-glass flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Cartelera</span>
              </button>
              <button onClick={() => navigate('/candybar')} className="btn-candybar-glow">
                <span className="inline-block animate-pulse mr-1">🍿</span> <span className="hidden sm:inline">Dulcería</span>
              </button>
              <button onClick={() => navigate('/my-tickets')} className="btn-tickets-glass flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Mis Compras</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                if (profile?.role === 'admin') navigate('/admin');
                else if (profile?.role === 'staff') navigate('/pos');
                else if (profile?.role === 'porter') navigate('/portero');
                else navigate('/movies');
              }}
              className="btn-tickets-glass flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver al Panel
            </button>
          )}

          <div className="h-6 w-px bg-slate-800" />

          <div className="vip-profile-card">
            <div className="vip-avatar-container">
              <div className="vip-avatar-content">
                {profile?.fullname ? profile.fullname.charAt(0).toUpperCase() : 'C'}
              </div>
            </div>
            <div className="hidden md:flex vip-profile-info">
              <span className="vip-profile-name">{profile?.fullname || 'Usuario'}</span>
              <span className="vip-profile-badge">
                {profile?.role === 'admin' ? <><span className="vip-profile-crown">🛠️</span> Administrador</>
                  : profile?.role === 'staff' ? <><span className="vip-profile-crown">💼</span> Personal POS</>
                    : profile?.role === 'porter' ? <><span className="vip-profile-crown">🔍</span> Portero</>
                      : <><span className="vip-profile-crown">👑</span> Miembro Socio</>}
              </span>
            </div>
          </div>

          <button onClick={handleLogout} className="logout-btn-hud flex items-center gap-1.5">
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in px-4 mt-8 w-full">

        {/* Header / Profile Info — Aurora Premium */}
        <div className="profile-header-aurora flex flex-col md:flex-row items-center gap-8 p-8 rounded-[40px]">
          <div className="relative flex-shrink-0">
            <div className="profile-avatar-glow w-32 h-32 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-4xl font-black text-white shadow-2xl">
              {profile.fullname?.charAt(0).toUpperCase()}
            </div>
            <div className={`absolute -bottom-2 -right-2 p-2 rounded-2xl ${level.bg} ${level.border} border backdrop-blur-md level-badge-animated`}>
              <level.icon className={`w-6 h-6 ${level.color}`} />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-black text-white tracking-tight">{profile.fullname}</h1>
            <p className="text-slate-500 font-medium mb-4">{profile.email}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${level.bg} ${level.color} border ${level.border} level-badge-animated`}>
                Socio {profile.membershipLevel}
              </span>
              <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {profile.role}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/80 p-6 rounded-3xl border border-slate-800/60 text-center min-w-[160px] backdrop-blur-sm">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">CinePoints</p>
            <p className="cinepoints-counter text-4xl font-black">{profile.points}</p>
            <p className="text-[10px] text-blue-400 font-bold mt-2 flex items-center justify-center gap-1">
              <Gift className="w-3 h-3" /> Canjear Premios
            </p>
          </div>
        </div>

        {/* Tab Navigation — Sliding indicator */}
        <div className="tab-nav-container flex border-b border-slate-800 gap-6 pb-2">
          <button
            id="tab-profile"
            onClick={() => setActiveTab('profile')}
            className={`pb-2 text-sm font-bold uppercase tracking-wider transition-colors duration-200 border-b-2 cursor-pointer ${activeTab === 'profile'
              ? 'text-white border-transparent font-black'
              : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
          >
            Mi Perfil
          </button>
          <button
            id="tab-club"
            onClick={() => setActiveTab('club')}
            className={`pb-2 text-sm font-bold uppercase tracking-wider transition-colors duration-200 border-b-2 cursor-pointer ${activeTab === 'club'
              ? 'text-white border-transparent font-black'
              : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
          >
            Club CineStream
          </button>
          {/* Sliding glowing indicator */}
          <div
            className="tab-indicator"
            style={{
              left: activeTab === 'profile' ? '0px' : '88px',
              width: activeTab === 'profile' ? '76px' : '120px',
            }}
          />
        </div>

        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
            {/* Tarjeta de Membresía Digital */}
            <div className="md:col-span-1 space-y-6">
              <div
                onClick={() => setCardFlipped(!cardFlipped)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className={`relative overflow-hidden aspect-[1.58/1] rounded-3xl p-6 flex flex-col justify-between shadow-2xl border ${level.border} ${level.bg} group cursor-pointer select-none`}
                style={{
                  transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale3d(1.02, 1.02, 1.02)`,
                  transition: rotate.x === 0 ? 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), border-color 0.3s, background-color 0.3s' : 'border-color 0.3s, background-color 0.3s',
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Glossy sheen overlay */}
                <div
                  className="absolute inset-0 pointer-events-none transition-opacity duration-300 rounded-3xl z-20"
                  style={{
                    background: `radial-gradient(circle 140px at ${sheen.x}% ${sheen.y}%, rgba(255, 255, 255, 0.22), transparent)`,
                    opacity: sheen.opacity,
                  }}
                />
                {!cardFlipped ? (
                  <>
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                      <level.icon className="w-40 h-40" />
                    </div>
                    <div className="flex justify-between items-start z-10">
                      <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                        <Shield className={`w-6 h-6 ${level.color}`} />
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-50">CineStream</p>
                        <p className={`text-xs font-black ${level.color} uppercase tracking-widest`}>Member Card</p>
                      </div>
                    </div>
                    <div className="z-10">
                      <p className="text-[10px] font-mono text-white/40 mb-1">ID SOCIO: CS-{profile.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xl font-black text-white tracking-widest uppercase truncate">{profile.fullname}</p>
                      <p className="text-[8px] text-blue-400 font-bold mt-1 text-right tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">Ver código ↻</p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-between justify-between h-full z-10 py-1">
                    <div className="flex justify-between items-center w-full">
                      <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-50">Lector Digital</p>
                      <p className="text-[8px] text-blue-400 font-bold tracking-widest uppercase">Volver ↻</p>
                    </div>
                    {/* Código de barras simulado */}
                    <div className="bg-white p-2 rounded-xl flex flex-col items-center justify-center w-full shadow-inner">
                      <div className="flex items-center justify-between w-full h-8 px-1 bg-white">
                        {[1, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 4, 1, 2].map((w, idx) => (
                          <div
                            key={idx}
                            className="bg-black h-6"
                            style={{ width: `${w}px` }}
                          />
                        ))}
                      </div>
                      <p className="text-[8px] font-mono text-slate-800 mt-1 font-bold">CS-{profile.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <p className="text-[8px] text-slate-400 text-center leading-tight">Muestra este código en boletería o confitería.</p>
                  </div>
                )}
              </div>

              {(() => {
                const currentLevel = profile.membershipLevel || 'Bronce';
                let targetLevel = 'Plata';
                let targetPoints = 500;
                let nextBenefit = '10% de descuento en confitería';
                let barGradient = 'bg-gradient-to-r from-orange-500 via-amber-500 to-slate-300';
                let NextIcon = Award;
                let isMax = false;

                if (currentLevel === 'Plata') {
                  targetLevel = 'Oro';
                  targetPoints = 1000;
                  nextBenefit = '1 boleto gratis al mes y combo refill';
                  barGradient = 'bg-gradient-to-r from-slate-400 via-slate-200 to-yellow-400';
                  NextIcon = Sparkles;
                } else if (currentLevel === 'Oro') {
                  targetLevel = 'VIP Máximo';
                  targetPoints = 1000;
                  nextBenefit = 'Acceso a preventas y combo gratis en tu cumpleaños';
                  barGradient = 'bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-300';
                  NextIcon = Sparkles;
                  isMax = true;
                }

                const percentage = isMax ? 100 : Math.min((profile.points / targetPoints) * 100, 100);
                const pointsRemaining = Math.max(targetPoints - profile.points, 0);

                return (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group">
                    {/* Subtle background glow */}
                    <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition-all duration-700" />

                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-black text-white uppercase tracking-widest">Nivel & Beneficios</h3>
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
                        Socio {currentLevel}
                      </span>
                    </div>

                    <div className="space-y-4">
                      {/* Header showing target or achievement */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/50 flex items-center justify-center shrink-0">
                          <NextIcon className="w-5 h-5 text-blue-400 animate-pulse" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white font-bold tracking-tight">
                            {isMax ? '¡Nivel VIP Máximo alcanzado!' : `Próximo Nivel: ${targetLevel}`}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5 leading-snug">
                            {nextBenefit}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar Container */}
                      <div className="space-y-2">
                        <div className="w-full bg-slate-950/80 h-3 rounded-full overflow-hidden p-[2px] border border-slate-800/80 shadow-inner">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 animate-gradient-flow ${barGradient}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                          <span className="text-slate-500">
                            {profile.points} / {isMax ? 'Max' : `${targetPoints} pts`}
                          </span>
                          <span className="text-slate-400">
                            {isMax ? '100% Completado' : `Faltan ${pointsRemaining} pts`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Historial de Compras y Cupones */}
            <div className="md:col-span-2 space-y-8">

              {/* Cupones Activos */}
              <div className="space-y-6">
                <h2 className="text-xl font-black text-white flex items-center gap-2 pl-4 section-title-glow">
                  <Gift className="w-6 h-6 text-emerald-400" />
                  Mis Cupones de Crédito
                </h2>
                {coupons && coupons.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {coupons.map((coupon, i) => (
                      <div
                        key={i}
                        className="coupon-card bg-slate-900/40 border border-slate-800 p-5 rounded-3xl group hover:border-emerald-500/30 transition-all flex flex-col justify-between"
                        style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.05) 0%, rgba(17,24,39,0.6) 100%)' }}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Código de Crédito</p>
                            <p className="text-lg font-black text-white font-mono tracking-wider">{coupon.code}</p>
                          </div>
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Bs. {coupon.value}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
                          <span className="text-[9px] text-slate-500 font-semibold uppercase">
                            Expira: {new Date(coupon.expiresAt).toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(coupon.code);
                              alert("Código de cupón copiado: " + coupon.code);
                            }}
                            className="text-[10px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer transition-colors"
                          >
                            Copiar Código
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-900/20 border border-slate-800/60 rounded-3xl p-6 text-center text-slate-500 text-xs">
                    No tienes cupones de crédito activos.
                  </div>
                )}
              </div>

              {/* Historial Reciente */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-white flex items-center gap-2 pl-4 section-title-glow">
                    <History className="w-6 h-6 text-blue-500" />
                    Historial Reciente
                  </h2>
                  <button
                    onClick={() => navigate('/my-tickets')}
                    className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-400 cursor-pointer"
                  >
                    Ver Todo
                  </button>
                </div>

                <div className="space-y-4">
                  {history.length > 0 ? history.map((ticket, i) => (
                    <div key={i} className="history-row bg-slate-900/30 border border-slate-800/50 p-5 rounded-3xl flex items-center gap-5 group">
                      <div className="w-16 h-20 rounded-xl bg-slate-800 overflow-hidden shrink-0">
                        <img
                          src={ticket.Function?.Movie?.posterUrl
                            ? getImageUrl(ticket.Function.Movie.posterUrl)
                            : '/cinema_combo_premium.png'}
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                          alt={ticket.Function?.Movie?.title || 'Solo Dulcería'}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-bold leading-tight mb-1">{ticket.Function?.Movie?.title || 'Solo Dulcería'}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                            <Ticket className="w-3 h-3" /> {ticket.ticketCount} Entradas
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {new Date(ticket.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-black">Bs. {ticket.totalPrice}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate('/my-tickets')}
                        className="p-2 rounded-xl bg-slate-800 text-slate-500 hover:text-white transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )) : (
                    <div className="p-20 text-center opacity-30">
                      <Ticket className="w-16 h-16 mx-auto mb-4" />
                      <p className="text-sm font-bold uppercase tracking-widest">Aún no tienes compras</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'club' && (
          <ClubCineStream />
        )}

      </div>
    </div>
  );
}
