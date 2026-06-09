import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAPIUrl, getImageUrl, SOCKET_URL } from '../config/api';
import { useTicket } from '../context/TicketContext';
import { useAuth } from '../context/AuthContext';
import { toastError } from '../utils/toastHelper';
import { Ticket, Popcorn, Film } from 'lucide-react';
import InteractiveMap from './InteractiveMap';

export default function SeatSelection() {
  const { functionId } = useParams();
  const navigate = useNavigate();
  const { selectedSeats } = useTicket();
  const { user, logout } = useAuth();
  
  const handleLogout = () => { logout(); navigate('/login'); };

  const [funcDetails, setFuncDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFunctionDetails = async () => {
      try {
        const res = await axios.get(getAPIUrl(`/api/functions/${functionId}`));
        setFuncDetails(res.data.data);
      } catch (error) {
        toastError('Error al cargar los detalles de la función.');
        navigate('/movies');
      } finally {
        setLoading(false);
      }
    };

    fetchFunctionDetails();
  }, [functionId, navigate]);

  const handleContinue = () => {
    if (selectedSeats.length === 0) {
      toastError('Por favor, selecciona al menos un asiento.');
      return;
    }
    navigate('/candybar');
  };

  const handleBack = () => {
    navigate('/movies');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col py-8 px-4 animate-fade-in">
        <div className="max-w-5xl mx-auto w-full">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-8">
            <div className="skeleton h-8 w-24 rounded-lg" />
            <div className="skeleton h-7 w-48 rounded-lg" />
            <div className="w-24" />
          </div>
          {/* Info card skeleton */}
          <div className="rounded-2xl border border-slate-800 p-5 mb-8 flex flex-col md:flex-row items-center gap-5"
            style={{ background: '#1E2A3B' }}>
            <div className="skeleton w-20 h-32 rounded-lg shrink-0" />
            <div className="flex-1 w-full space-y-3">
              <div className="skeleton h-7 w-3/4 rounded-lg" />
              <div className="flex gap-3">
                <div className="skeleton h-6 w-24 rounded-full" />
                <div className="skeleton h-6 w-20 rounded-full" />
                <div className="skeleton h-6 w-36 rounded-full" />
              </div>
            </div>
          </div>
          {/* Pantalla (etiqueta) skeleton */}
          <div className="skeleton h-3 w-32 mx-auto rounded mb-6" />
          {/* Grid de asientos skeleton */}
          <div className="flex flex-wrap justify-center gap-1.5">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="skeleton rounded-md"
                style={{ width: '36px', height: '32px', animationDelay: `${(i % 10) * 0.04}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!funcDetails) return null;

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      {/* ── Navbar ── */}
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
          <button onClick={() => navigate('/movies')} className="btn-tickets-glass flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Cartelera</span>
          </button>
          <button onClick={() => navigate('/candybar')} className="btn-tickets-glass flex items-center gap-1.5">
            <Popcorn className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Dulcería</span>
          </button>
          <button onClick={() => navigate('/my-tickets')} className="btn-tickets-glass flex items-center gap-1.5">
            <Ticket className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Mis Compras</span>
          </button>
          <div className="h-6 w-px bg-slate-800" />
          <div onClick={() => navigate('/profile')} className="vip-profile-card">
            <div className="vip-avatar-container">
              <div className="vip-avatar-content">
                {user?.fullname ? user.fullname.charAt(0).toUpperCase() : 'C'}
              </div>
            </div>
            <div className="hidden md:flex vip-profile-info">
              <span className="vip-profile-name">{user?.fullname || 'Cliente'}</span>
              <span className="vip-profile-badge">
                {user?.role === 'admin' ? <><span className="vip-profile-crown">🛠️</span> Administrador</>
                : user?.role === 'staff' ? <><span className="vip-profile-crown">💼</span> Personal POS</>
                : user?.role === 'porter' ? <><span className="vip-profile-crown">🔍</span> Portero</>
                : <><span className="vip-profile-crown">👑</span> Miembro Socio</>}
              </span>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-btn-hud flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </nav>

      <div className="flex-1 py-8 px-4 animate-fade-in">
      <div className="max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-center mb-8">
          <h1 className="text-3xl font-display font-black text-white tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">Selección de Asientos</h1>
        </div>

        {/* Info Peli */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] mb-10 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-brand-primary/10 transition-colors duration-700" />
          
          {funcDetails.Movie?.posterUrl ? (
            <div className="w-24 h-36 shrink-0 poster-shine-wrapper shadow-[0_15px_30px_rgba(0,0,0,0.6)] border border-slate-600/50 rounded-xl overflow-hidden relative z-10 group-hover:scale-105 transition-transform duration-500">
              <img 
                src={getImageUrl(funcDetails.Movie.posterUrl)} 
                alt={funcDetails.Movie.title} 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-24 h-36 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700/50 shrink-0 relative z-10">
              <span className="text-slate-500 text-xs font-bold uppercase">Sin Póster</span>
            </div>
          )}
          
          <div className="flex-1 text-center md:text-left relative z-10">
            <h2 className="text-4xl font-extrabold text-white mb-2 tracking-tight drop-shadow-md">{funcDetails.Movie?.title}</h2>
            <p className="text-slate-400 text-sm mb-4 line-clamp-2 max-w-2xl mx-auto md:mx-0">
              {funcDetails.Movie?.synopsis || 'Sin sinopsis disponible.'}
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 text-sm font-bold text-slate-300">
              <span className="bg-slate-800/80 border border-slate-700 px-4 py-1.5 rounded-full shadow-inner">{funcDetails.Room?.name}</span>
              <span className="bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-full border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Bs. {parseFloat(funcDetails.price).toFixed(2)}
              </span>
              <span className="bg-slate-800/80 border border-slate-700 px-4 py-1.5 rounded-full shadow-inner flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {new Date(funcDetails.startTime).toLocaleString('es-BO', {
                  weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Mapa Interactivo */}
        <InteractiveMap 
          functionId={functionId} 
          capacity={funcDetails.Room?.capacity || 50} 
          soldSeats={funcDetails.soldSeats || []}
        />

        {/* Floating Bottom Bar */}
        {selectedSeats.length > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-2xl animate-slide-up">
            <div className="bg-slate-900/80 backdrop-blur-2xl border border-brand-primary/40 shadow-[0_0_40px_rgba(59,130,246,0.2)] rounded-3xl px-8 py-5 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-brand-primary/80 text-xs font-black uppercase tracking-widest mb-0.5">Total Seleccionado</span>
                <span className="text-white font-black text-2xl tracking-tight flex items-baseline gap-3">
                  {selectedSeats.length} <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">Asientos</span>
                  <span className="text-slate-500 text-base font-medium hidden sm:inline">× Bs. {funcDetails.price}</span>
                  <span className="text-emerald-400 font-mono text-3xl ml-2">Bs. {(selectedSeats.length * funcDetails.price).toFixed(2)}</span>
                </span>
              </div>
              <button
                onClick={handleContinue}
                className="bg-brand-primary hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] py-3 px-8 rounded-xl font-bold uppercase tracking-wider text-sm transition-all hover:scale-105 flex items-center gap-2"
              >
                Continuar
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
