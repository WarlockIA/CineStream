import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getAPIUrl, getImageUrl, SOCKET_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useTicket } from '../context/TicketContext';
import { useNavigate } from 'react-router-dom';
import { toastSuccess, toastError, toastWarning } from '../utils/toastHelper';
import InteractiveMap from './InteractiveMap';
import {
  Search, Plus, Minus, CreditCard, DollarSign,
  ChevronRight, ChevronLeft, CheckCircle2, Film, Armchair,
  Popcorn, Receipt, Keyboard, Lock, Unlock, AlertCircle, Loader2, LogOut, RotateCcw
} from 'lucide-react';

const STEPS = [
  { id: 'FUNCTION', label: 'Función', icon: Film },
  { id: 'SEATS', label: 'Asientos', icon: Armchair },
  { id: 'SNACKS', label: 'Dulcería', icon: Popcorn },
  { id: 'CONFIRM', label: 'Confirmar', icon: Receipt },
];

const localDataMap = {
  's1': { description: '1 Pipoca Extra Grande + 2 Refrescos Medianos + 1 Chocolate', image: '/cinema_combo_premium.png' },
  's2': { description: 'Pipoca crujiente con extra mantequilla', image: '/cinema_popcorn_classic.png' },
  's3': { description: 'Coca-Cola, Fanta o Sprite (500ml)', image: '/cinema_soda_fountain.png' },
  's4': { description: '1 Pipoca Mediana + 1 Refresco Pequeño', image: '/cinema_combo_personal.png' },
  's5': { description: 'Sabroso hot dog con aderezos clásicos de cine', image: '/cinema_hot_dog.png' },
  's6': { description: '1 Pipoca Grande, 1 Bebida Grande y 1 porción de nachos con queso y jalapeños', image: '/cinema_combo_nachos.png' },
  's7': { description: '1 Pipoca Gigante + 2 Bebidas Grandes + 1 Hot Dog Premium + 1 Chocolates', image: '/cinema_combo_pareja.png' },
  's8': { description: 'Deliciosa barra de chocolate con leche o dulces confitados', image: '/cinema_chocolate.png' }
};

// ─── Badge de atajo de teclado ────────────────────────────────────────────────
const KbdBadge = ({ children, active }) => (
  <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-all duration-200 border ${
    active 
      ? 'bg-emerald-500/30 text-white border-emerald-400 scale-110 shadow-[0_0_12px_rgba(16,185,129,0.4)] font-black animate-keypress' 
      : 'border-white/10 text-slate-400'
  }`}
    style={active ? {} : { background: 'rgba(255,255,255,0.08)' }}>
    {children}
  </span>
);


// ─── Stepper ──────────────────────────────────────────────────────────────────
const Stepper = ({ currentStep, isSnackOnly }) => (
  <div className="flex items-center justify-between gap-2 py-6 px-8 border-b border-white/5 bg-slate-900/50 backdrop-blur-md">
    {STEPS.map((s, idx) => {
      const isPast = idx < currentStep;
      const isActive = idx === currentStep;
      const isLocked = isSnackOnly && s.id === 'SEATS';

      return (
        <React.Fragment key={s.id}>
          <div className={`flex flex-col items-center gap-2 relative ${isLocked ? 'opacity-40' : ''}`}>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg ${
              isActive ? 'bg-blue-600 text-white scale-110 ring-4 ring-blue-500/20' :
              isPast ? 'bg-emerald-500 text-white' :
              isLocked ? 'bg-slate-800 text-slate-600' : 'bg-slate-800 text-slate-500'
            }`}>
              {isLocked ? <Lock className="w-5 h-5" /> : (isPast ? <CheckCircle2 className="w-5 h-5" /> : <s.icon className="w-5 h-5" />)}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-blue-400' : isPast ? 'text-emerald-400' : 'text-slate-500'}`}>
              {s.label}
            </span>
            {isActive && <div className="absolute -bottom-6 w-1 h-1 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]" />}
          </div>
          {idx < STEPS.length - 1 && (
            <div className={`flex-1 h-[2px] rounded-full transition-all duration-700 ${isPast ? 'bg-emerald-500' : 'bg-slate-800'}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Sidebar de Resumen ───────────────────────────────────────────────────────
const PosSidebar = ({ func, seats, snacks, ticketPrice, snackTotal, total, isSnackOnly, isSelling }) => {
  const barcodeValue = React.useMemo(() => {
    return `CS-${Math.floor(10000000 + Math.random() * 90000000)}`;
  }, []);

  return (
    <div className="w-80 border-l border-white/5 bg-slate-950/70 flex flex-col hidden lg:flex relative shadow-[0_0_30px_rgba(0,0,0,0.5)] p-4 h-full min-h-0 overflow-hidden">
      {/* Outer wrapper to look like a physical cinema ticket */}
      <div className={`ticket-retro flex-1 flex flex-col min-h-0 overflow-hidden ${isSelling ? 'animate-ticket-print' : ''}`}>
        {/* Jagged top edge */}
        <div className="ticket-jagged-top" />
        
        {/* Header */}
        <div className="pt-3 pb-1.5 px-4 border-b border-white/5 text-center shrink-0">
          <span className="text-[9px] font-black tracking-[0.25em] text-blue-400 uppercase">★ CINESTREAM PREMIER ★</span>
          <h2 className="text-xs font-mono font-bold text-slate-400 mt-0.5 uppercase tracking-widest">Resumen de Orden</h2>
        </div>
        
        {/* Scrollable ticket body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3 space-y-4 font-mono">
          {/* Sección Tickets */}
          {!isSnackOnly && func ? (
            <div className="space-y-2.5 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-3">
                {func.Movie?.posterUrl ? (
                  <img 
                    src={getImageUrl(func.Movie.posterUrl)} 
                    alt={func.Movie?.title} 
                    className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-700/50 shadow-sm"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                    <Film className="w-4 h-4 text-blue-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-white font-bold text-xs truncate leading-none">{func.Movie?.title}</p>
                  <p className="text-slate-500 text-[10px] mt-1">{func.Room?.name}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {seats.map(s => (
                  <span key={s} className="px-1.5 py-0.5 bg-blue-500/15 border border-blue-500/20 rounded text-[9px] font-bold text-blue-300">
                    #{s}
                  </span>
                ))}
                {seats.length === 0 && <span className="text-slate-600 text-xs italic">No hay asientos...</span>}
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-white/5">
                <span className="text-slate-500">Subtotal Tickets</span>
                <span className="text-white font-bold">Bs. {ticketPrice.toFixed(2)}</span>
              </div>
            </div>
          ) : isSnackOnly ? (
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center gap-2.5 animate-in fade-in scale-in-95">
              <Popcorn className="w-4 h-4 text-amber-500" />
              <span className="text-amber-500 text-[10px] font-black uppercase tracking-wider">Solo Dulcería</span>
            </div>
          ) : (
            <div className="h-20 flex items-center justify-center border border-dashed border-slate-800 rounded-2xl">
              <span className="text-slate-600 text-[10px] font-bold uppercase tracking-widest italic">Esperando función...</span>
            </div>
          )}

          {/* Sección Snacks */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Dulcería</h3>
              <span className="text-emerald-400 text-xs">Bs. {snackTotal.toFixed(2)}</span>
            </div>
            <div className="space-y-1.5">
              {snacks.map(s => (
                <div key={s.id} className="flex items-center justify-between animate-in fade-in slide-in-from-right-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-4 h-4 rounded bg-slate-850 flex items-center justify-center text-[9px] font-bold text-slate-400">
                      {s.quantity}
                    </span>
                    <span className="text-slate-300 truncate max-w-[140px]">{s.name}</span>
                  </div>
                  <span className="text-slate-500 text-[10px]">Bs. {(s.price * s.quantity).toFixed(2)}</span>
                </div>
              ))}
              {snacks.length === 0 && (
                <div className="h-16 flex items-center justify-center border border-dashed border-slate-800 rounded-2xl">
                  <span className="text-slate-600 text-[9px] font-bold uppercase tracking-widest italic">Sin confitería</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Perforación de Recibo Físico */}
        <div className="relative w-full overflow-visible z-10 my-0.5">
          <div className="ticket-notch ticket-notch-left top-1/2 -translate-y-1/2" />
          <div className="ticket-notch ticket-notch-right top-1/2 -translate-y-1/2" />
          <div className="perforated-dots-divider !my-0" style={{ margin: '2px 0' }} />
        </div>

        {/* Total Footer con Código de Barras */}
        <div className="px-4 py-2 bg-slate-950/40 space-y-1.5 relative mt-auto border-t border-white/5 shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex flex-col text-left">
              <span className="text-slate-500 text-[9px] font-bold uppercase leading-none">Total Final</span>
              <span className="text-[9px] font-mono text-slate-400 font-bold block mt-1 leading-none">{barcodeValue}</span>
            </div>
            <span className="text-xl font-black text-emerald-400 font-mono tracking-tighter">
              Bs. {total.toFixed(2)}
            </span>
          </div>

          {/* Barcode Mockup */}
          <div className="flex flex-col items-center pt-0.5 opacity-60 hover:opacity-90 transition-all duration-300">
            <div className="flex items-center justify-center w-full h-5 px-3 bg-white/5 rounded-md py-0.5 border border-white/5">
              {[1, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 4, 1, 2].map((w, idx) => (
                <div 
                  key={idx} 
                  className="bg-slate-400 h-3" 
                  style={{ width: `${w}px`, marginLeft: idx > 0 ? '1.5px' : '0' }} 
                />
              ))}
            </div>
          </div>
          
          <div className="text-center text-[7px] text-slate-600 font-bold uppercase tracking-wider">
            ★ ADMIT ONE · CINESTREAM TAQUILLA ★
          </div>
        </div>

        {/* Jagged bottom edge */}
        <div className="ticket-jagged-bottom" />
      </div>
    </div>
  );
};

// ─── Paso 1: Selección de Función ─────────────────────────────────────────────
const StepFunction = ({ onSelect, onSoloSnacks }) => {
  const [functions, setFunctions] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');

  useEffect(() => {
    axios.get(getAPIUrl('/api/functions'))
      .then(r => setFunctions(r.data.data || []))
      .catch(() => toastError('Error al cargar funciones del día.'))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toDateString();
  const filtered = functions
    .filter(f => {
      const sameDay = new Date(f.startTime).toDateString() === today;
      const future  = new Date(f.startTime) > new Date();
      const matchQ  = !search || f.Movie?.title?.toLowerCase().includes(search.toLowerCase());
      return sameDay && future && matchQ;
    })
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  return (
    <div className="flex flex-col h-full p-5 gap-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="w-full pl-11 pr-4 py-4 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
            style={{ background: '#1E2A3B', border: '1px solid #334155' }}
            placeholder="Buscar película..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <button
          onClick={onSoloSnacks}
          className="group flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-sm transition-all border border-amber-500/20 text-amber-500 hover:bg-amber-500/10 active:scale-95"
          style={{ background: 'rgba(245,158,11,0.05)' }}
        >
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Popcorn className="w-4 h-4" />
          </div>
          SOLO DULCERÍA
        </button>
      </div>

      {loading ? (
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
          <Film className="w-12 h-12 text-slate-700 mb-3" />
          <p className="text-slate-400 font-medium">No hay funciones disponibles hoy</p>
          <p className="text-slate-600 text-sm mt-1">{search ? 'Prueba con otro nombre' : 'Vuelve más tarde'}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-2">
          {filtered.map(f => {
            const time = new Date(f.startTime).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
            const date = new Date(f.startTime).toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'short' });
            const poster = f.Movie?.posterUrl;
            
            return (
              <button
                key={f.id}
                onClick={() => onSelect(f)}
                className="group flex flex-row p-3 gap-4 rounded-2xl text-left transition-all hover:-translate-y-1 hover:shadow-2xl active:scale-[0.98] relative overflow-hidden min-h-[140px] w-full"
                style={{ background: '#111827', border: '1px solid rgba(51,65,85,0.6)', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#3B82F6';
                  e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(59,130,246,0.3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(51,65,85,0.6)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
                }}
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Movie Poster */}
                <div className="w-20 h-28 shrink-0 rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center shadow-inner relative z-10">
                  {poster ? (
                    <img 
                      src={poster.startsWith('http') ? poster : getImageUrl(poster)} 
                      alt={f.Movie?.title} 
                      className="w-full h-full block object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                  ) : (
                    <Film className="w-8 h-8 text-slate-600" />
                  )}
                  {/* Inner subtle shadow */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                </div>
                
                {/* Function Details */}
                <div className="flex flex-col flex-1 py-1 relative z-10">
                  <h3 className="font-bold text-white text-[15px] leading-tight line-clamp-2 pr-2 group-hover:text-blue-400 transition-colors duration-300">
                    {f.Movie?.title}
                  </h3>
                  
                  <p className="text-slate-400 text-xs mt-1 line-clamp-2">
                    {f.Movie?.synopsis || 'Disfruta de este gran estreno en nuestras salas con el mejor sonido e imagen digital.'}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 font-black text-xs border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                      {time}
                    </span>
                    <span className="text-slate-400 text-xs truncate max-w-[120px] bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                      {f.Room?.name}
                    </span>
                  </div>
                  
                  <div className="flex items-end justify-between mt-auto">
                    <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">{date}</span>
                    <span className="text-emerald-400 text-sm font-black tracking-tighter drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">Bs. {f.price}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Paso 2: Mapa de Asientos ─────────────────────────────────────────────────
const StepSeats = ({ func }) => {
  const [soldSeats, setSoldSeats] = useState([]);

  useEffect(() => {
    axios.get(getAPIUrl(`/api/functions/${func.id}`))
      .then(r => {
        const sold = r.data.data?.soldSeats || [];
        setSoldSeats(sold);
      })
      .catch(() => {});
  }, [func.id]);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mb-4 p-3 rounded-xl flex items-center gap-3"
        style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
        <Film className="w-5 h-5 text-blue-400 shrink-0" />
        <div>
          <p className="text-white font-bold text-sm">{func.Movie?.title}</p>
          <p className="text-slate-400 text-xs">{func.Room?.name} · {new Date(func.startTime).toLocaleString('es-BO', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</p>
        </div>
      </div>
      <InteractiveMap
        functionId={func.id}
        capacity={func.Room?.capacity || 50}
        soldSeats={soldSeats}
      />
    </div>
  );
};

// Helper de Emojis Dinámico
const getSnackEmoji = (name) => {
  const lowercaseName = name.toLowerCase();
  if (lowercaseName.includes('mega') || lowercaseName.includes('gigante') || lowercaseName.includes('grande')) {
    return '🍿🥤✨';
  }
  if (lowercaseName.includes('combo') && lowercaseName.includes('personal')) {
    return '🍿🥤';
  }
  if (lowercaseName.includes('combo')) {
    return '🍿🥤🍟';
  }
  if (lowercaseName.includes('pipoca') || lowercaseName.includes('palomitas') || lowercaseName.includes('popcorn')) {
    return '🍿';
  }
  if (lowercaseName.includes('gaseosa') || lowercaseName.includes('refresco') || lowercaseName.includes('soda') || lowercaseName.includes('cola') || lowercaseName.includes('agua')) {
    return '🥤';
  }
  if (lowercaseName.includes('chocolate') || lowercaseName.includes('barra')) {
    return '🍫';
  }
  if (lowercaseName.includes('dulce') || lowercaseName.includes('caramelo') || lowercaseName.includes('gomita')) {
    return '🍬';
  }
  if (lowercaseName.includes('jugo') || lowercaseName.includes('juice')) {
    return '🧃';
  }
  if (lowercaseName.includes('cafe') || lowercaseName.includes('café') || lowercaseName.includes('té') || lowercaseName.includes('caliente')) {
    return '☕';
  }
  return '🍿';
};

// ─── Paso 3: Dulcería Fast-Track ──────────────────────────────────────────────
const StepSnacks = ({ cart, onAdd, onRemove, onProductsLoaded }) => {
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    axios.get(getAPIUrl('/api/products'))
      .then(r => {
        const prodList = r.data.data || [];
        setProducts(prodList);
        if (onProductsLoaded) onProductsLoaded(prodList);
      })
      .catch(() => toastError('Error cargando dulcería.'))
      .finally(() => setLoading(false));
  }, [onProductsLoaded]);

  const combos = products.filter(p => p.name.toLowerCase().includes('combo'));
  const generalProducts = products.filter(p => !p.name.toLowerCase().includes('combo'));

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
      {loading ? (
        <div className="flex-1 p-6 grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Columna Izquierda: Combos Favoritos */}
          <div className="w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-white/5 bg-slate-950/30 flex flex-col p-4 overflow-y-auto">
            <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-1.5 drop-shadow-[0_0_10px_rgba(245,158,11,0.2)]">
              <span>⭐</span> Combos Favoritos (1-Clic)
            </h3>
            <div className="space-y-3">
              {combos.map((p) => {
                const inCart = cart.find(c => c.id === p.id);
                const oos = p.stock === 0;
                return (
                  <div
                    key={p.id}
                    className="group rounded-2xl overflow-hidden flex flex-col transition-all duration-300 relative border"
                    style={{
                      background: inCart ? 'rgba(245,158,11,0.08)' : '#111827',
                      borderColor: inCart ? '#eab308' : 'rgba(51,65,85,0.6)',
                      boxShadow: inCart 
                        ? '0 10px 20px -5px rgba(234,179,8,0.2), inset 0 0 12px rgba(234,179,8,0.05)'
                        : '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                  >
                    <button
                      disabled={oos}
                      onClick={() => !oos && onAdd(p)}
                      className="flex items-center p-4 gap-4 text-left w-full transition-all active:scale-95 disabled:opacity-40"
                    >
                      <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center p-1">
                        <img src={localDataMap[p.id]?.image || '/cinema_popcorn_classic.png'} alt={p.name} className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-white text-sm font-bold block truncate leading-snug group-hover:text-amber-400 transition-colors">{p.name}</span>
                        {localDataMap[p.id]?.description && (
                          <span className="text-slate-400 text-[10px] block leading-tight mt-1 line-clamp-2">{localDataMap[p.id].description}</span>
                        )}
                        <span className="text-amber-400 font-mono font-black text-sm block mt-1.5">Bs. {parseFloat(p.price).toFixed(2)}</span>
                        {oos ? (
                          <span className="text-red-400 text-[10px] font-bold block mt-1">Agotado</span>
                        ) : (
                          <span className="text-slate-500 text-[9px] font-bold block mt-1">Stock: {p.stock}</span>
                        )}
                      </div>
                    </button>

                    {inCart && (
                      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/60 border-t border-slate-800">
                        <button
                          onClick={() => onRemove(p.id)}
                          aria-label={`Quitar un ${p.name}`}
                          className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors text-slate-400 active:scale-90"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-white font-black text-base">{inCart.quantity}</span>
                        <button
                          onClick={() => onAdd(p)}
                          disabled={inCart.quantity >= p.stock}
                          aria-label={`Agregar un ${p.name}`}
                          className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center hover:bg-amber-500/30 text-amber-400 transition-colors disabled:opacity-40 active:scale-90"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {combos.length === 0 && (
                <p className="text-slate-600 text-xs italic text-center py-4">No hay combos registrados</p>
              )}
            </div>
          </div>

          {/* Columna Derecha: Catálogo General */}
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <span>🍿</span> Catálogo General de Snacks
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {generalProducts.map((p) => {
                const inCart = cart.find(c => c.id === p.id);
                const oos = p.stock === 0;
                return (
                  <div
                    key={p.id}
                    className="group rounded-2xl overflow-hidden flex flex-col transition-all duration-300 border"
                    style={{
                      background: inCart ? 'rgba(59,130,246,0.05)' : '#111827',
                      borderColor: inCart ? 'rgba(59,130,246,0.5)' : 'rgba(51,65,85,0.5)',
                      boxShadow: inCart ? '0 8px 16px rgba(59,130,246,0.1)' : 'none',
                    }}
                  >
                    <button
                      disabled={oos}
                      onClick={() => !oos && onAdd(p)}
                      className="flex flex-col items-center p-4 gap-2 flex-1 text-center w-full transition-all active:scale-95 disabled:opacity-40"
                    >
                      <div className="w-14 h-14 shrink-0 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center p-1 mb-1">
                        <img src={localDataMap[p.id]?.image || '/cinema_popcorn_classic.png'} alt={p.name} className="w-full h-full object-contain filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.2)]" />
                      </div>
                      <span className="text-white text-xs font-semibold leading-snug group-hover:text-blue-400 transition-colors line-clamp-2 min-h-[2rem] flex items-center justify-center">{p.name}</span>
                      <span className="text-emerald-400 font-mono font-black text-sm">Bs. {parseFloat(p.price).toFixed(2)}</span>
                      {oos ? (
                        <span className="text-red-400 text-[10px] font-bold">Agotado</span>
                      ) : (
                        <span className="text-slate-500 text-[9px] font-medium">Stock: {p.stock}</span>
                      )}
                    </button>

                    {inCart && (
                      <div className="flex items-center justify-between px-3 py-2 bg-slate-950/40 border-t border-slate-800">
                        <button
                          onClick={() => onRemove(p.id)}
                          aria-label={`Quitar un ${p.name}`}
                          className="w-6 h-6 rounded-lg bg-slate-850 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors text-slate-400"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-white font-bold text-sm">{inCart.quantity}</span>
                        <button
                          onClick={() => onAdd(p)}
                          disabled={inCart.quantity >= p.stock}
                          aria-label={`Agregar un ${p.name}`}
                          className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center hover:bg-blue-500/30 text-blue-400 transition-colors disabled:opacity-40"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Paso 4: Confirmación ─────────────────────────────────────────────────────
const StepConfirm = ({ func, seats, snackCart, ticketPrice, snackTotal, total, isSnackOnly, paymentMethod, onMethodChange }) => (
  <div className="flex-1 overflow-y-auto p-5 space-y-6">
    <div className="text-center mb-4">
      <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Resumen de Cobro</h2>
      <p className="text-slate-500 text-xs">Verifica los datos antes de procesar el pago</p>
    </div>

    {/* Función y Asientos */}
    {!isSnackOnly && func && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-500">
        <div className="rounded-3xl p-5 relative overflow-hidden" style={{ background: '#1E2A3B', border: '1px solid #334155' }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -mr-16 -mt-16" />
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3">Entradas</p>
          <div className="flex items-start gap-4">
            {func.Movie?.posterUrl ? (
              <img
                src={getImageUrl(func.Movie.posterUrl)}
                alt={func.Movie?.title}
                className="w-16 h-24 block object-cover rounded-xl shrink-0 shadow-lg border border-white/10"
              />
            ) : (
              <div className="w-16 h-24 rounded-xl shrink-0 bg-slate-800 border border-slate-700 flex items-center justify-center">
                <Film className="w-6 h-6 text-slate-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-base font-black leading-tight mb-1 truncate">{func.Movie?.title}</p>
              <p className="text-slate-400 text-xs">{func.Room?.name} · {new Date(func.startTime).toLocaleTimeString()}</p>
              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                <span className="text-slate-500 text-xs">Total Tickets</span>
                <span className="text-white font-mono font-bold">Bs. {ticketPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl p-6" style={{ background: '#1E2A3B', border: '1px solid #334155' }}>
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4">Asientos ({seats.length})</p>
          <div className="flex flex-wrap gap-2">
            {seats.map(s => (
              <span key={s} className="px-3 py-1.5 rounded-xl text-xs font-black text-white font-mono"
                style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.2)' }}>
                #{s}
              </span>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* Dulcería */}
    {snackCart.length > 0 && (
      <div className="rounded-3xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ background: '#1E2A3B', border: '1px solid #334155' }}>
        <div className="flex items-center justify-between mb-6">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Productos Dulcería</p>
          <span className="text-amber-500 font-mono text-sm font-bold">Bs. {snackTotal.toFixed(2)}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-3">
          {snackCart.map(item => (
            <div key={item.id} className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">{item.quantity}</span>
                <span className="text-slate-300 font-medium">{item.name}</span>
              </div>
              <span className="text-slate-500 font-mono text-xs">Bs. {(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Selección de Método de Pago (HU-14) */}
    <div className="rounded-3xl p-6" style={{ background: '#111827', border: '1px solid #334155' }}>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
        <CreditCard className="w-3 h-3 text-blue-400" />
        Método de Pago
      </p>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onMethodChange('cash')}
          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${paymentMethod === 'cash' ? 'border-emerald-500 bg-emerald-500/10 text-white' : 'border-slate-800 bg-slate-900/50 text-slate-500'}`}
        >
          <DollarSign className={`w-6 h-6 ${paymentMethod === 'cash' ? 'text-emerald-400' : ''}`} />
          <span className="text-xs font-bold uppercase tracking-tight">Efectivo</span>
          <span className={`text-[8px] font-bold ${paymentMethod === 'cash' ? 'text-emerald-500' : 'text-slate-700'}`}>TECLA: E</span>
        </button>
        <button
          onClick={() => onMethodChange('qr')}
          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${paymentMethod === 'qr' ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-slate-800 bg-slate-900/50 text-slate-500'}`}
        >
          <Receipt className={`w-6 h-6 ${paymentMethod === 'qr' ? 'text-blue-400' : ''}`} />
          <span className="text-xs font-bold uppercase tracking-tight">QR / Transf.</span>
          <span className={`text-[8px] font-bold ${paymentMethod === 'qr' ? 'text-blue-500' : 'text-slate-700'}`}>TECLA: Q</span>
        </button>
      </div>
    </div>

    {/* Total Final Callout */}
    <div className="rounded-[40px] p-8 text-center relative overflow-hidden group transition-all" 
         style={{ 
           background: paymentMethod === 'qr' ? 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)', 
           boxShadow: paymentMethod === 'qr' ? '0 20px 40px -15px rgba(59,130,246,0.4)' : '0 20px 40px -15px rgba(16,185,129,0.4)' 
         }}>
      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity" />
      <p className="text-white/80 text-xs font-black uppercase tracking-[0.3em] mb-2 opacity-80">Total a Pagar</p>
      <p className="text-white text-6xl font-black font-mono tracking-tighter">
        Bs. {total.toFixed(2)}
      </p>
      <div className="mt-4 flex items-center justify-center gap-2 text-white/50 text-[10px] font-bold uppercase">
        {paymentMethod === 'qr' ? <><Receipt className="w-3 h-3" /> QR / Transferencia </> : <><DollarSign className="w-3 h-3" /> Efectivo en Ventanilla</>}
        · CineStream POS
      </div>
    </div>

  </div>
);

// ─── Ticket de Resultado ──────────────────────────────────────────────────────
const SaleResult = ({ result, onNew }) => (
  <div className="flex flex-col h-full items-center justify-center p-6 text-center animate-fade-in">
    <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
      style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
      <CheckCircle2 className="w-10 h-10 text-emerald-400" />
    </div>
    <h2 className="text-2xl font-black text-white mb-1" style={{ fontFamily: 'Montserrat, Inter, sans-serif' }}>
      ¡Venta Exitosa!
    </h2>
    <p className="text-slate-400 text-sm mb-6">Entrega el ticket al cliente</p>

    {/* Códigos QR de Venta */}
    <div className="flex flex-wrap gap-6 justify-center items-center mb-6">
      {result.qrBase64 && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1">
            <Film className="w-3 h-3" /> Entrada a Sala
          </span>
          <div className="bg-white p-3 rounded-2xl shadow-[0_0_15px_rgba(59,130,246,0.2)]"
            style={{ border: '1px solid rgba(59,130,246,0.3)' }}>
            <img src={result.qrBase64} alt="QR Sala" className="w-36 h-36 object-contain" />
          </div>
        </div>
      )}

      {result.snacksQrBase64 && (
        <div className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
            <Popcorn className="w-3 h-3" /> Dulcería Express
          </span>
          <div className="bg-white p-3 rounded-2xl shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            style={{ border: '1px solid rgba(245,158,11,0.3)' }}>
            <img src={result.snacksQrBase64} alt="QR Dulcería" className="w-36 h-36 object-contain" />
          </div>
        </div>
      )}
    </div>

    <div className="text-left w-full max-w-xs space-y-2 mb-6">
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">Película:</span>
        <span className="text-white font-medium">{result.movieTitle}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">Sala:</span>
        <span className="text-white font-medium">{result.roomName}</span>
      </div>
      {result.seatNumbers && result.seatNumbers.length > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Asientos:</span>
          <span className="text-white font-medium">{result.seatNumbers?.join(', ')}</span>
        </div>
      )}
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">Total:</span>
        <span className="text-emerald-400 font-bold">Bs. {result.totalPrice}</span>
      </div>
      <div className="flex justify-between text-xs pt-2 border-t border-slate-800">
        <span className="text-slate-600">Txn:</span>
        <span className="text-slate-500 font-mono">{result.transactionId}</span>
      </div>
    </div>

    <button onClick={onNew}
      className="flex items-center gap-2 font-bold py-4 px-8 rounded-2xl transition-all w-full justify-center"
      style={{ background: '#3B82F6', color: '#fff', boxShadow: '0 4px 20px rgba(59,130,246,0.3)' }}
      onMouseEnter={e => e.currentTarget.style.background = '#2563EB'}
      onMouseLeave={e => e.currentTarget.style.background = '#3B82F6'}>
      <RotateCcw className="w-5 h-5" />
      Nueva Venta
    </button>
  </div>
);

// ─── Componente Principal POS ─────────────────────────────────────────────────
export default function PosPanel() {
  const { token, user, logout }   = useAuth();
  const { selectedSeats, clearSeats, setCurrentFunctionId } = useTicket();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [step,         setStep]      = useState(0);   // 0-3
  const [isSnackOnly,  setIsSnackOnly] = useState(false);
  const [func,         setFunc]      = useState(null);
  const [snackCart,    setSnackCart] = useState([]);
  const [selling,      setSelling]   = useState(false);
  const [products,     setProducts]  = useState([]);  // caché para atajos numéricos
  
  // Estados de Turno (Caja)
  const [shift,        setShift]     = useState(undefined); // undefined = loading
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [actualCash,   setActualCash] = useState('');
  const [closing,      setClosing]   = useState(false);
  const [shiftSummary, setShiftSummary] = useState(null);

  // Estados de Venta
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash', 'qr'
  const [activeKey, setActiveKey] = useState(null);

  // Estados de Conectividad y Sincronización Offline
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState(() => {
    try {
      const saved = localStorage.getItem('cinestream_offline_bookings');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [syncing, setSyncing] = useState(false);

  // Reloj en tiempo real (para pantalla de Caja Cerrada)
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Conectividad reactiva
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Precios calculados
  const ticketPrice = func ? (parseFloat(func.price) * selectedSeats.length) : 0;
  const snackTotal  = snackCart.reduce((a, s) => a + s.price * s.quantity, 0);
  const total       = ticketPrice + snackTotal;

  const handleSelectFunc = (f) => {
    setIsSnackOnly(false);
    clearSeats();
    setSnackCart([]);
    setCurrentFunctionId(f.id);
    setFunc(f);
    setStep(1);
  };

  const handleSoloSnacks = () => {
    setIsSnackOnly(true);
    setFunc(null);
    clearSeats();
    setSnackCart([]);
    setStep(2); // Salta directo a Dulcería
  };

  const handleAddSnack = useCallback((p) => {
    setSnackCart(prev => {
      const ex = prev.find(s => s.id === p.id);
      if (ex) return prev.map(s => s.id === p.id ? { ...s, quantity: s.quantity + 1 } : s);
      return [...prev, { id: p.id, name: p.name, price: parseFloat(p.price), quantity: 1 }];
    });
  }, []);

  const handleRemoveSnack = useCallback((id) => {
    setSnackCart(prev => {
      const ex = prev.find(s => s.id === id);
      if (ex?.quantity === 1) return prev.filter(s => s.id !== id);
      return prev.map(s => s.id === id ? { ...s, quantity: s.quantity - 1 } : s);
    });
  }, []);

  const handleNext = useCallback(() => {
    if (step === 0 && !func && !isSnackOnly) {
      toastWarning('Selecciona una función o pulsa "Solo Dulcería".');
      return;
    }
    if (step === 1 && !isSnackOnly && selectedSeats.length === 0) {
      toastWarning('Selecciona al menos un asiento.');
      return;
    }
    setStep(s => s + 1);
  }, [step, selectedSeats.length, func, isSnackOnly]);

  const handleBack = useCallback(() => {
    if (step === 1) { 
      setStep(0); 
      clearSeats(); 
    } else if (step === 2 && isSnackOnly) {
      setStep(0);
      setIsSnackOnly(false);
    } else {
      setStep(s => s - 1);
    }
  }, [step, clearSeats, isSnackOnly]);

  const processOfflineBooking = useCallback((payload) => {
    const mockTicketData = {
      id: `off_${Date.now()}`,
      transactionId: `OFFLINE-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`,
      movieTitle: func?.Movie?.title || 'Solo Dulcería',
      roomName: func?.Room?.name || 'N/A',
      startTime: func?.startTime || null,
      seatNumbers: payload.seatNumbers,
      ticketPrice: ticketPrice,
      snackTotal: snackTotal,
      totalPrice: total,
      paymentMethod: paymentMethod,
      isSnackOnly: isSnackOnly,
      isOffline: true,
      createdAt: new Date().toISOString(),
      snacks: payload.snacks
    };

    const updatedQueue = [...offlineQueue, { payload, mockTicketData }];
    setOfflineQueue(updatedQueue);
    localStorage.setItem('cinestream_offline_bookings', JSON.stringify(updatedQueue));

    toastWarning('Sin conexión. Venta registrada localmente (Modo Offline).');
    clearSeats();
    navigate('/thank-you', { state: { ticketData: mockTicketData } });
  }, [func, ticketPrice, snackTotal, total, paymentMethod, isSnackOnly, offlineQueue, clearSeats, navigate]);

  const syncOfflineBookings = useCallback(async () => {
    if (syncing || offlineQueue.length === 0) return;
    if (!navigator.onLine) return;

    setSyncing(true);
    let queue = [...offlineQueue];
    let successfulSyncs = 0;

    for (let i = 0; i < queue.length; i++) {
      const { payload } = queue[i];
      try {
        await axios.post(getAPIUrl('/api/bookings/pos-checkout'), payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        queue.splice(i, 1);
        i--;
        successfulSyncs++;
      } catch (err) {
        console.error('Error sincronizando offline booking:', err);
        const isNetworkError = !err.response || err.code === 'ERR_NETWORK' || err.message === 'Network Error';
        if (isNetworkError) {
          toastWarning('Sincronización pausada debido a problemas de red.');
          break;
        } else {
          const msg = err.response?.data?.message || 'Error de validación en reserva offline.';
          toastError(`Venta offline rechazada por el servidor: ${msg}. Se removerá de la cola.`);
          queue.splice(i, 1);
          i--;
        }
      }
    }

    setOfflineQueue(queue);
    localStorage.setItem('cinestream_offline_bookings', JSON.stringify(queue));
    setSyncing(false);

    if (successfulSyncs > 0) {
      toastSuccess(`¡Sincronización completada! ${successfulSyncs} ventas pendientes enviadas.`);
    }
  }, [offlineQueue, syncing, token]);

  useEffect(() => {
    const handleOnline = () => {
      syncOfflineBookings();
    };
    window.addEventListener('online', handleOnline);
    const interval = setInterval(() => {
      if (navigator.onLine && offlineQueue.length > 0) {
        syncOfflineBookings();
      }
    }, 20000);
    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [syncOfflineBookings, offlineQueue.length]);

  const handleSell = useCallback(async () => {
    if (selling) return;
    if (!isSnackOnly && selectedSeats.length === 0) {
      toastWarning('Selecciona al menos un asiento.');
      return;
    }
    if (isSnackOnly && snackCart.length === 0) {
      toastWarning('Agrega productos a la dulcería.');
      return;
    }

    const payload = {
      functionId:  func?.id || null,
      seatNumbers: isSnackOnly ? [] : (selectedSeats || []),
      snacks:      snackCart.map(s => ({ id: s.id, name: s.name, price: s.price, quantity: s.quantity })),
      totalPrice:  total,
      isSnackOnly: isSnackOnly,
      paymentMethod: paymentMethod
    };

    if (!navigator.onLine) {
      processOfflineBooking(payload);
      return;
    }

    setSelling(true);
    try {
      console.log('--- CineStream POS Payload ---', payload);

      const res = await axios.post(getAPIUrl('/api/bookings/pos-checkout'), payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('--- CineStream POS Response ---', res.data);
      const ticketData = res.data.data;
      toastSuccess('¡Venta procesada! Mostrando ticket...');
      clearSeats();

      navigate('/thank-you', { state: { ticketData } });

    } catch (err) {
      console.error('Error procesando venta POS:', err);
      const isNetworkError = !err.response || err.code === 'ERR_NETWORK' || err.message === 'Network Error';
      if (isNetworkError) {
        processOfflineBooking(payload);
      } else {
        const msg = err.response?.data?.message || 'Error al procesar la venta.';
        const detail = err.response?.data?.detail ? ` (${err.response.data.detail.slice(0, 50)}...)` : '';
        toastError(msg + detail);
      }
    } finally {
      setSelling(false);
    }
  }, [selling, selectedSeats, func, snackCart, total, token, clearSeats, navigate, isSnackOnly, paymentMethod, processOfflineBooking]);

  // ── Lógica de Turnos ──────────────────────────────────────────────────────
  const fetchCurrentShift = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(getAPIUrl('/api/shifts/current'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShift(res.data.data);
    } catch (err) {
      console.error('Error verificando turno:', err);
      // No seteamos shift a null inmediatamente si es un error de red/servidor
      // para no mostrar la pantalla de "Caja Cerrada" falsamente.
      if (err.response?.status === 403) {
        toastError('Sesión inválida o expirada.');
        setShift(null);
      } else {
        toastError('Error de conexión al verificar la caja.');
        // Mantener como undefined para permitir reintentos o mostrar error de red
      }
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchCurrentShift();
    }
  }, [fetchCurrentShift, token]);

  // Cargar resumen de arqueo desglosado
  useEffect(() => {
    if (showCloseModal && token) {
      axios.get(getAPIUrl('/api/shifts/summary'), {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => setShiftSummary(r.data.data))
        .catch(() => toastError('Error al cargar resumen de ventas.'));
    } else {
      setShiftSummary(null);
    }
  }, [showCloseModal, token]);


  const handleOpenShift = async () => {
    try {
      const res = await axios.post(getAPIUrl('/api/shifts/open'), {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShift(res.data.data);
      toastSuccess('¡Turno de caja abierto!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al abrir la caja.';
      toastError(msg);
      // Si el error dice que ya hay uno abierto, reintentamos el fetch
      if (err.response?.status === 400 && msg.includes('ya tienes')) {
        fetchCurrentShift();
      }
    }
  };

  const handleCloseShift = async () => {
    if (!actualCash || isNaN(actualCash) || actualCash < 0) {
      return toastWarning('Ingresa un monto físico válido.');
    }
    setClosing(true);
    try {
      const res = await axios.post(getAPIUrl('/api/shifts/close'), { actualCash }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toastSuccess('Arqueo completado y caja cerrada.');
      setShowCloseModal(false);
      setShift(null); // Regresar a la pantalla de apertura
    } catch (err) {
      toastError(err.response?.data?.message || 'Error al cerrar caja.');
    } finally {
      setClosing(false);
    }
  };

  // ── Atajos de teclado globales ────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      let flashKey = null;
      switch (e.key) {
        case 'Enter':
          flashKey = e.ctrlKey ? 'CtrlEnter' : 'Enter';
          if (e.ctrlKey) {
            e.preventDefault();
            handleSell();
          } else {
            if (step === 3) handleSell();
            else if (step > 0 || isSnackOnly) handleNext();
          }
          break;

        case 'F2':
          flashKey = 'F2';
          e.preventDefault();
          handleSell();
          break;

        case 'Escape':
          flashKey = 'Esc';
          if (step > 0) handleBack();
          break;

        case 'e':
        case 'E':
          flashKey = 'E';
          if (step === 3) setPaymentMethod('cash');
          break;
        case 'q':
        case 'Q':
          flashKey = 'Q';
          if (step === 3) setPaymentMethod('qr');
          break;

        default:
          if (step === 2) {
            const num = parseInt(e.key, 10);
            if (num >= 1 && num <= 9 && products[num - 1] && products[num - 1].stock > 0) {
              flashKey = String(num);
              handleAddSnack(products[num - 1]);
            }
          }
      }

      if (flashKey) {
        setActiveKey(flashKey);
        setTimeout(() => setActiveKey(prev => prev === flashKey ? null : prev), 200);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [step, handleNext, handleBack, handleSell, handleAddSnack, products, setPaymentMethod, isSnackOnly]);


  // ── Render ────────────────────────────────────────────────────────────────
  if (shift === undefined) {
    return <div className="min-h-screen flex items-center justify-center bg-brand-dark"><div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" /></div>;
  }

  if (shift === null) {
    const timeStr = clock.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = clock.toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
      <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden" style={{ background: '#020817' }}>

        {/* ── Panel Izquierdo: Branding cinematográfico ── */}
        <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center overflow-hidden">
          {/* Fondo con gradiente cinematográfico */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #020c1f 0%, #071224 50%, #020817 100%)' }} />

          {/* Film strip decorativo - izquierda */}
          <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col" style={{ background: 'rgba(0,0,0,0.4)', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="mx-auto my-1.5 rounded-sm shrink-0" style={{ width: 24, height: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} />
            ))}
          </div>
          {/* Film strip decorativo - derecha */}
          <div className="absolute right-0 top-0 bottom-0 w-12 flex flex-col" style={{ background: 'rgba(0,0,0,0.4)', borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="mx-auto my-1.5 rounded-sm shrink-0" style={{ width: 24, height: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} />
            ))}
          </div>

          {/* Partículas flotantes */}
          {[
            { top: '15%', left: '20%', size: 3, color: '#3b82f6', delay: '0s', dur: '3s' },
            { top: '70%', left: '75%', size: 2, color: '#10b981', delay: '1s', dur: '4s' },
            { top: '40%', left: '85%', size: 4, color: '#8b5cf6', delay: '0.5s', dur: '5s' },
            { top: '85%', left: '25%', size: 2, color: '#f59e0b', delay: '2s', dur: '3.5s' },
            { top: '25%', left: '60%', size: 3, color: '#ec4899', delay: '1.5s', dur: '4.5s' },
          ].map((p, i) => (
            <div key={i} className="absolute rounded-full animate-pulse pointer-events-none"
              style={{ top: p.top, left: p.left, width: p.size, height: p.size, background: p.color, boxShadow: `0 0 ${p.size * 4}px ${p.color}`, animationDelay: p.delay, animationDuration: p.dur, opacity: 0.6 }} />
          ))}

          {/* Orbes de fondo */}
          <div className="absolute top-[-10%] left-[5%] w-[450px] h-[450px] rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.1), transparent 65%)' }} />
          <div className="absolute bottom-[-10%] right-[5%] w-[350px] h-[350px] rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08), transparent 65%)' }} />

          {/* Contenido izquierdo */}
          <div className="relative z-10 flex flex-col items-center text-center px-16">
            {/* Logo */}
            <div className="mb-6">
              <div className="flex items-center justify-center gap-4 mb-2">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 p-0.5 shadow-[0_0_25px_rgba(59,130,246,0.4)]">
                  <div className="w-full h-full bg-[#070B14] rounded-[14px] flex items-center justify-center">
                    <Film className="w-8 h-8 text-blue-500 animate-pulse" />
                  </div>
                </div>
                <div className="text-left">
                  <h1 className="text-5xl font-black tracking-tight leading-none" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    <span className="text-white">Cine</span>
                    <span style={{ background: 'linear-gradient(90deg, #60a5fa, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Stream</span>
                  </h1>
                  <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.25em] mt-1">Sistema de Taquilla Digital</p>
                </div>
              </div>
              {/* Línea decorativa bajo el logo */}
              <div className="flex items-center gap-2 mt-3">
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(96,165,250,0.3))' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
                <div className="w-1 h-1 rounded-full bg-blue-500/30" />
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(96,165,250,0.3), transparent)' }} />
              </div>
            </div>

            {/* Reloj POS */}
            <div className="mb-6 rounded-2xl px-10 py-5 w-full" style={{ background: 'rgba(6,15,30,0.8)', border: '1px solid rgba(96,165,250,0.12)', backdropFilter: 'blur(16px)', boxShadow: '0 0 40px rgba(59,130,246,0.05), inset 0 1px 0 rgba(255,255,255,0.03)' }}>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-2">Hora del Sistema</p>
              <p className="text-5xl font-black font-mono tabular-nums" style={{ color: '#60a5fa', textShadow: '0 0 20px rgba(96,165,250,0.4), 0 0 60px rgba(96,165,250,0.2)', letterSpacing: '-0.02em' }}>
                {timeStr}
              </p>
              <p className="text-slate-500 text-xs capitalize mt-2 font-medium">{dateStr}</p>
            </div>

            {/* Features del sistema — con icon boxes */}
            <div className="space-y-2 w-full">
              {[
                { icon: '🎟️', title: 'Taquilla Digital', desc: 'Venta de entradas en tiempo real', color: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.2)' },
                { icon: '🍿', title: 'Dulcería Express', desc: 'Combos y snacks con QR de retiro', color: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.2)' },
                { icon: '💳', title: 'Cobros Flexibles', desc: 'Efectivo, QR y transferencias', color: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.2)' },
                { icon: '📊', title: 'Arqueo Integrado', desc: 'Cierre de caja con desglose completo', color: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.2)' },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3 text-left px-4 py-2.5 rounded-xl transition-all"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
                    style={{ background: f.color, border: `1px solid ${f.border}` }}>
                    {f.icon}
                  </div>
                  <div>
                    <p className="text-white text-xs font-bold leading-none">{f.title}</p>
                    <p className="text-slate-600 text-[10px] mt-0.5">{f.desc}</p>
                  </div>
                  <div className="ml-auto w-1.5 h-1.5 rounded-full opacity-40" style={{ background: f.border }} />
                </div>
              ))}
            </div>

            {/* Footer de versión */}
            <p className="text-slate-800 text-[9px] font-mono uppercase tracking-widest mt-6">v2.0 · CineStream POS Terminal</p>
          </div>
        </div>

        {/* Divisor vertical con glow */}
        <div className="hidden lg:flex w-px relative flex-col items-center justify-center" style={{ background: 'linear-gradient(180deg, transparent 5%, rgba(59,130,246,0.2) 30%, rgba(16,185,129,0.2) 70%, transparent 95%)' }}>
          <div className="absolute w-4 h-4 rounded-full -translate-x-1/2" style={{ background: 'rgba(59,130,246,0.3)', boxShadow: '0 0 16px rgba(59,130,246,0.4)' }} />
        </div>

        {/* ── Panel Derecho: Login / Estado de caja ── */}
        <div className="flex-1 lg:w-1/2 flex flex-col relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #050d1a 0%, #030a14 60%, #020817 100%)' }}>

          {/* Circuit board pattern sutil */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg stroke='%2360a5fa' stroke-width='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />

          {/* Scanline */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.008) 0px, rgba(255,255,255,0.008) 1px, transparent 1px, transparent 4px)',
          }} />

          {/* Orbe rojo tenue */}
          <div className="absolute bottom-[-5%] left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(239,68,68,0.06), transparent 65%)' }} />
          <div className="absolute top-[-5%] right-[-10%] w-[300px] h-[300px] rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent 65%)' }} />

          {/* ── Barra de estado superior (tipo terminal) ── */}
          <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b" style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.04)' }}>
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-blue-500" />
              <span className="text-white text-xs font-black tracking-wide" style={{ fontFamily: 'Montserrat, sans-serif' }}>CineStream</span>
              <span className="text-slate-700 text-xs">·</span>
              <span className="text-slate-600 text-[10px] font-mono">POS v2.0</span>
            </div>
            <div className="flex items-center gap-3">
              {/* Indicadores de sistema */}
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" style={{ boxShadow: '0 0 6px rgba(16,185,129,0.6)' }} />
                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Online</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm" style={{ background: 'rgba(239,68,68,0.8)' }} />
                <div className="w-2 h-2 rounded-sm" style={{ background: 'rgba(245,158,11,0.5)' }} />
                <div className="w-2 h-2 rounded-sm" style={{ background: 'rgba(16,185,129,0.4)' }} />
              </div>
            </div>
          </div>

          {/* ── Contenido central ── */}
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="relative z-10 w-full max-w-sm">

              {/* Badge de rol */}
              <div className="flex justify-center mb-5">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)', color: '#7dd3fc' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  Personal POS · Terminal Autorizada
                </div>
              </div>

              {/* Card principal */}
              <div className="rounded-3xl overflow-hidden" style={{
                background: 'linear-gradient(160deg, rgba(12,24,44,0.95), rgba(8,16,32,0.98))',
                border: '1px solid rgba(239,68,68,0.18)',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 50px 100px rgba(0,0,0,0.8), 0 0 80px rgba(239,68,68,0.04), inset 0 1px 0 rgba(255,255,255,0.04)'
              }}>

                {/* Banda roja superior con shimmer */}
                <div className="h-0.5 w-full relative overflow-hidden">
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(239,68,68,0.8) 50%, transparent 100%)' }} />
                </div>

                <div className="p-7 text-center">
                  {/* Ícono de candado */}
                  <div className="flex justify-center mb-5">
                    <div className="relative inline-flex items-center justify-center">
                      {/* Anillos */}
                      <div className="absolute w-28 h-28 rounded-full animate-ping opacity-[0.06]" style={{ background: 'rgba(239,68,68,1)' }} />
                      <div className="absolute w-24 h-24 rounded-full animate-pulse opacity-10" style={{ border: '1px solid rgba(239,68,68,0.8)' }} />
                      {/* Box del ícono */}
                      <div className="relative w-[72px] h-[72px] rounded-2xl flex items-center justify-center" style={{
                        background: 'linear-gradient(135deg, #180608 0%, #0e0306 100%)',
                        border: '1px solid rgba(239,68,68,0.25)',
                        boxShadow: '0 0 25px rgba(239,68,68,0.15), 0 0 60px rgba(239,68,68,0.07), inset 0 1px 0 rgba(255,100,100,0.08)'
                      }}>
                        <Lock className="w-9 h-9" style={{ color: '#fca5a5', filter: 'drop-shadow(0 0 12px rgba(239,68,68,0.9))' }} />
                      </div>
                    </div>
                  </div>

                  {/* Status chip */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    <span className="text-red-400 text-[9px] font-black uppercase tracking-widest">Terminal Inactiva</span>
                  </div>

                  <h2 className="text-2xl font-black text-white mb-3" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>
                    Caja Cerrada
                  </h2>
                  <p className="text-slate-500 text-xs leading-relaxed mb-5">
                    Abre tu turno para comenzar a registrar ventas. Todas las transacciones quedarán asignadas a tu nombre.
                  </p>

                  {/* Separador */}
                  <div className="flex items-center gap-2 mb-5">
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
                    <div className="w-1 h-1 rounded-full bg-slate-800" />
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  </div>

                  {/* Info del cajero */}
                  {user?.fullname && (
                    <div className="mb-5 p-3 rounded-2xl text-left relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-slate-600 text-[9px] uppercase tracking-widest font-bold">Operador</p>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" style={{ boxShadow: '0 0 4px rgba(16,185,129,0.6)' }} />
                          <span className="text-emerald-500 text-[9px] font-bold">Autenticado</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 relative" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(37,99,235,0.2))', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.25)' }}>
                          {user.fullname.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-black leading-none truncate">{user.fullname}</p>
                          <p className="text-slate-500 text-[10px] mt-0.5">💼 Personal POS · {user?.role === 'admin' ? 'Administrador' : 'Cajero'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Botón principal con shimmer */}
                  <div className="flex flex-col gap-2.5">
                    <button
                      onClick={handleOpenShift}
                      className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all duration-200 relative overflow-hidden group active:scale-[0.98]"
                      style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 50%, #34d399 100%)', color: '#fff', boxShadow: '0 4px 24px rgba(16,185,129,0.4), 0 0 0 1px rgba(16,185,129,0.3), inset 0 1px 0 rgba(255,255,255,0.15)' }}
                    >
                      {/* Shimmer animado */}
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }} />
                      <Unlock className="w-4 h-4 relative z-10" />
                      <span className="relative z-10">Abrir Caja</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="logout-btn-hud w-full flex items-center justify-center gap-2 py-3.5 text-xs font-bold tracking-wider cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar Sesión
                    </button>
                  </div>
                </div>

                {/* Banda inferior verde */}
                <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.5), transparent)' }} />
              </div>

              {/* Footer */}
              <p className="text-slate-800 text-[9px] mt-4 text-center font-mono tracking-widest uppercase">
                🔒 CINESTREAM · ACCESO RESTRINGIDO · SOLO PERSONAL AUTORIZADO
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-brand-dark flex flex-col overflow-hidden">

      {/* Navbar POS */}
      <nav className="shrink-0 flex items-center justify-between px-6 py-3 nav-premium sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-3 select-none">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 p-0.5 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <div className="w-full h-full bg-[#070B14] rounded-[9px] flex items-center justify-center">
                <Film className="w-5 h-5 text-blue-500 animate-pulse" />
              </div>
            </div>
            <div>
              <h1 className="logo-text-premium leading-none">
                CineStream
              </h1>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block mt-0.5">💼 Personal POS</span>
            </div>
          </div>

          {/* Online/Offline status badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase border bg-slate-900 border-slate-800">
            {isOnline ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-emerald-400">Online</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-amber-400">Offline</span>
              </>
            )}
          </div>
          {syncing && (
            <div className="flex items-center gap-1 text-[9px] text-blue-400 font-bold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full animate-pulse">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              Sincronizando
            </div>
          )}
        </div>

        {/* Acciones Navbar: Resumen, Perfil y Cierre de Caja */}
        <div className="flex items-center gap-4">
          {step > 0 && (
            <div className="flex items-center gap-3 text-sm mr-2">
              {func && <span className="text-slate-400 hidden sm:block truncate max-w-[160px]">{func.Movie?.title}</span>}
              {selectedSeats.length > 0 && (
                <span className="flex items-center gap-1 text-blue-400 font-bold">
                  <Armchair className="w-4 h-4" />{selectedSeats.length}
                </span>
              )}
              {snackCart.length > 0 && (
                <span className="flex items-center gap-1 text-yellow-400 font-bold">
                  <Popcorn className="w-4 h-4" />{snackCart.reduce((a, s) => a + s.quantity, 0)}
                </span>
              )}
              <span className="text-emerald-400 font-black">Bs. {total.toFixed(2)}</span>
            </div>
          )}

          {/* User info + avatar (Clickable to Profile) */}
          <div 
            onClick={() => navigate('/profile')}
            className="vip-profile-card"
          >
            <div className="vip-avatar-container">
              <div className="vip-avatar-content">
                {user?.fullname ? user.fullname.charAt(0).toUpperCase() : 'P'}
              </div>
            </div>
            <div className="hidden md:flex vip-profile-info">
              <span className="vip-profile-name">
                {user?.fullname || 'Personal'}
              </span>
              <span className="vip-profile-badge">
                <span className="vip-profile-crown">💼</span> Personal POS
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800" />
          
          <button 
            onClick={() => setShowCloseModal(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-xs font-bold"
          >
            <Lock className="w-3 h-3" /> Arqueo de Caja
          </button>
        </div>
      </nav>

      {/* Banner de Sincronización Offline */}
      {offlineQueue.length > 0 && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-2 flex items-center justify-between text-xs text-amber-400 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>Tienes <strong>{offlineQueue.length}</strong> transacciones pendientes de sincronizar. Se enviarán automáticamente al detectar conexión.</span>
          </div>
          <button
            onClick={syncOfflineBookings}
            disabled={syncing}
            className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/30 active:scale-95 disabled:opacity-50 transition-all"
          >
            {syncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
          </button>
        </div>
      )}

      {/* Stepper */}
      <Stepper currentStep={step} isSnackOnly={isSnackOnly} />

      {/* Contenido Principal con Sidebar */}
      <div className="flex-1 min-h-0 overflow-hidden flex">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {step === 0 && <StepFunction onSelect={handleSelectFunc} onSoloSnacks={handleSoloSnacks} />}
          {step === 1 && func && <StepSeats func={func} />}
          {step === 2 && (
            <StepSnacks
              cart={snackCart}
              onAdd={handleAddSnack}
              onRemove={handleRemoveSnack}
              onProductsLoaded={setProducts}
            />
          )}
          {step === 3 && (
            <StepConfirm
              func={func}
              seats={selectedSeats}
              snackCart={snackCart}
              ticketPrice={ticketPrice}
              snackTotal={snackTotal}
              total={total}
              isSnackOnly={isSnackOnly}
              paymentMethod={paymentMethod}
              onMethodChange={setPaymentMethod}
            />
          )}

          {/* Barra de acciones (pasos 1-3) */}
          {step > 0 && (
            <div className="shrink-0 px-5 py-3 border-t border-slate-800"
              style={{ background: 'rgba(17,24,39,0.97)' }}>
              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all"
                  style={{ background: '#1E2A3B', color: '#94a3b8', border: '1px solid #334155' }}>
                  <ChevronLeft className="w-4 h-4" /> Volver
                </button>

                {step < 3 ? (
                  <>
                    <button
                      onClick={handleNext}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
                      style={{ background: '#3B82F6', color: '#fff', boxShadow: '0 4px 16px rgba(59,130,246,0.3)' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#2563EB'}
                      onMouseLeave={e => e.currentTarget.style.background = '#3B82F6'}>
                      {step === 2 ? 'Ver Resumen' : 'Continuar'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleSell}
                      disabled={selling || (step === 1 && selectedSeats.length === 0)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                      style={{ background: '#10B981', color: '#fff', boxShadow: '0 4px 16px rgba(16,185,129,0.2)' }}
                      title="Atajo: Ctrl + Enter"
                      onMouseEnter={e => { if (!selling) e.currentTarget.style.background = '#059669'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#10B981'; }}>
                      <CreditCard className="w-4 h-4" /> Cobro Express
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleSell}
                    disabled={selling || (!isSnackOnly && selectedSeats.length === 0)}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-base transition-all disabled:opacity-60"
                    style={{ background: '#10B981', color: '#fff', boxShadow: '0 4px 20px rgba(16,185,129,0.4)', letterSpacing: '0.02em' }}
                    onMouseEnter={e => { if (!selling) e.currentTarget.style.background = '#059669'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#10B981'; }}>
                    {selling ? (
                      <><div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" /> Procesando...</>
                    ) : (
                      <><CreditCard className="w-5 h-5" /> COBRAR &nbsp;Bs. {total.toFixed(2)}</>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Persistent Sidebar */}
        <PosSidebar 
          func={func}
          seats={selectedSeats}
          snacks={snackCart}
          ticketPrice={ticketPrice}
          snackTotal={snackTotal}
          total={total}
          isSnackOnly={isSnackOnly}
          isSelling={selling}
        />
      </div>
      
      {/* Modal Arqueo de Caja (Cierre Transparente) */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-center w-12 h-12 bg-red-500/10 rounded-full mb-4 mx-auto">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-white text-center mb-2">Cierre de Caja</h2>
            
            {/* Resumen Desglosado (Arqueo Preciso) */}
            {shiftSummary ? (
              <div className="bg-slate-950/50 rounded-xl p-4 mb-5 border border-slate-800 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold uppercase">Efectivo Esperado</span>
                  <span className="text-emerald-400 font-mono font-black">Bs. {shiftSummary.breakdown.cash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold uppercase">QR / Transferencia</span>
                  <span className="text-blue-400 font-mono font-black">Bs. {shiftSummary.breakdown.qr.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-black text-white uppercase tracking-tighter">Total Ventas</span>
                  <span className="text-sm font-black text-white font-mono">Bs. {shiftSummary.breakdown.total.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="h-20 flex flex-col items-center justify-center gap-2 mb-5">
                <Loader2 className="w-5 h-5 text-slate-700 animate-spin" />
                <span className="text-[10px] text-slate-600 font-bold uppercase">Calculando totales...</span>
              </div>
            )}

            <p className="text-slate-400 text-xs text-center mb-6 leading-relaxed">
              Cuenta el <strong>efectivo físico</strong> en tu gaveta e ingresa el monto total. 
              El sistema comparará este valor con el efectivo esperado.
            </p>

            
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Efectivo Físico Contado (Bs.)</label>
              <input 
                type="number" 
                min="0" step="0.5" 
                value={actualCash}
                onChange={e => setActualCash(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-lg text-center font-mono focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                placeholder="0.00"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowCloseModal(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCloseShift}
                disabled={closing || !actualCash}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {closing ? 'Procesando...' : 'Confirmar Arqueo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



