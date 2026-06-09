import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { getAPIUrl, getImageUrl, SOCKET_URL } from '../config/api';
import { toastSeatOccupied } from '../utils/toastHelper';
import { useTicket } from '../context/TicketContext';
import { Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─── Estilos y configuración por estado de asiento ────────────────────────────
const SEAT_CONFIG = {
  available: {
    bg: '#22c55e',              // green-500
    bgHover: '#16a34a',
    shadow: 'rgba(34,197,94,0.35)',
    cursor: 'pointer',
    label: 'Libre',
  },
  selected: {
    bg: '#eab308',              // yellow-500
    bgHover: '#ca8a04',
    shadow: 'rgba(234,179,8,0.5)',
    cursor: 'pointer',
    label: 'Seleccionado',
  },
  occupied: {
    bg: '#ef4444',              // red-500
    bgHover: '#ef4444',
    shadow: 'rgba(239,68,68,0.3)',
    cursor: 'not-allowed',
    label: 'Ocupado',
  },
  blocked: {
    bg: '#6b7280',              // gray-500
    bgHover: '#6b7280',
    shadow: 'rgba(107,114,128,0.3)',
    cursor: 'not-allowed',
    label: 'Bloqueado',
  },
};

// ─── Componente Seat con micro-animación ──────────────────────────────────────
const Seat = React.memo(({ seatNumber, status, onClick, flashing, isFocused }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const config = SEAT_CONFIG[status] || SEAT_CONFIG.available;
  const isInteractive = status === 'available' || status === 'selected';

  const handleClick = () => {
    if (!isInteractive) return;
    // Micro-animación: "pop" inmediato antes de procesar
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
    onClick(seatNumber);
  };

  const seatStyle = {
    backgroundColor: config.bg,
    boxShadow: isFocused 
      ? `0 0 0 3px #FFFFFF, 0 0 15px 5px ${config.shadow}`
      : `0 4px 12px ${config.shadow}`,
    cursor: config.cursor,
    // Micro-animación de escala + brillo al hacer click o tener foco
    transform: isAnimating ? 'scale(1.35)' : isFocused ? 'scale(1.15)' : 'scale(1)',
    transition: isAnimating
      ? 'transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.12s ease'
      : 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.15s ease',
    filter: isAnimating ? `brightness(1.3) drop-shadow(0 0 6px ${config.shadow})` : 'none',
    outline: 'none',
    border: isFocused ? '2px solid #FFFFFF' : 'none',
  };

  const flashClass = flashing
    ? status === 'occupied'
      ? 'animate-seat-occupied'
      : status === 'blocked'
      ? 'animate-seat-blocked'
      : ''
    : '';

  return (
    <button
      type="button"
      title={`Asiento ${seatNumber} — ${config.label}`}
      aria-label={`Asiento ${seatNumber}, ${config.label}`}
      disabled={!isInteractive}
      onClick={handleClick}
      className={`w-9 h-9 rounded-t-lg flex items-center justify-center text-white text-xs font-bold select-none transition-all duration-200 ${flashClass} ${
        isFocused ? 'ring-4 ring-white ring-offset-2 ring-offset-slate-900 z-20 scale-115 shadow-2xl' : ''
      }`}
      style={seatStyle}
      onMouseEnter={(e) => {
        if (isInteractive && !isAnimating && !isFocused) {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.08)';
          e.currentTarget.style.boxShadow = `0 8px 20px ${config.shadow}`;
        }
      }}
      onMouseLeave={(e) => {
        if (isInteractive && !isAnimating && !isFocused) {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = `0 4px 12px ${config.shadow}`;
        }
      }}
    >
      {status === 'blocked'
        ? <Lock className="w-3.5 h-3.5 text-gray-200 opacity-80" />
        : seatNumber
      }
    </button>
  );
});

Seat.displayName = 'Seat';

// ─── Leyenda ──────────────────────────────────────────────────────────────────
const Legend = () => {
  const { user } = useAuth();
  const showBlocked = user?.role === 'staff' || user?.role === 'admin';

  return (
    <div className="flex flex-wrap justify-center gap-4 pt-5 border-t border-slate-700/50">
      {Object.entries(SEAT_CONFIG)
        .filter(([key]) => key !== 'blocked' || showBlocked)
        .map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/40">
            <div
              className="w-4 h-4 rounded flex items-center justify-center shrink-0"
              style={{ backgroundColor: cfg.bg, boxShadow: `0 0 6px ${cfg.shadow}` }}
            >
              {key === 'blocked' && <Lock className="w-2.5 h-2.5 text-gray-200" />}
            </div>
            <span className="text-sm font-medium text-slate-300">{cfg.label}</span>
          </div>
        ))}
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function InteractiveMap({ functionId, capacity, soldSeats = [] }) {
  const [blockedSeats, setBlockedSeats] = useState({});
  const [realtimeOccupied, setRealtimeOccupied] = useState([]);
  const [flashingSeats, setFlashingSeats] = useState({});
  const { selectedSeats, addSeat, removeSeat, setCurrentFunctionId } = useTicket();
  const [socket, setSocket] = useState(null);
  const [focusedSeat, setFocusedSeat] = useState(null);

  useEffect(() => {
    setCurrentFunctionId(functionId);
    const newSocket = io(`${SOCKET_URL}/seats`);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join:function', functionId);
    });

    newSocket.on('seat:initial_locks', (locks) => {
      setBlockedSeats(locks);
    });

    newSocket.on('seat:update', ({ seatNumber, status }) => {
      const num = parseInt(seatNumber);

      // Activar parpadeo por 600ms coincidiendo con la animación CSS
      setFlashingSeats(prev => ({ ...prev, [num]: true }));
      setTimeout(() => {
        setFlashingSeats(prev => {
          const updated = { ...prev };
          delete updated[num];
          return updated;
        });
      }, 600);

      if (status === 'occupied') {
        setRealtimeOccupied(prev => [...new Set([...prev, num])]);
        setBlockedSeats(prev => {
          const updated = { ...prev };
          delete updated[num];
          return updated;
        });
      } else if (status === 'blocked') {
        setBlockedSeats(prev => ({ ...prev, [num]: { socketId: 'other' } }));
      } else if (status === 'available') {
        setBlockedSeats(prev => {
          const updated = { ...prev };
          delete updated[num];
          return updated;
        });
      }
    });

    newSocket.on('seat:error', (error) => {
      toastSeatOccupied(error.seatNumber || '');
    });

    return () => { newSocket.disconnect(); };
  }, [functionId, setCurrentFunctionId]);

  const handleSeatClick = useCallback((seatNumber) => {
    const isSelected = selectedSeats.includes(seatNumber);
    if (isSelected) {
      removeSeat(seatNumber);
      if (socket) socket.emit('seat:unselect', { functionId, seatNumber });
    } else {
      addSeat(seatNumber);
      if (socket) socket.emit('seat:lock', { functionId, seatNumber });
    }
  }, [functionId, socket, selectedSeats, addSeat, removeSeat]);

  // Teclado: atajos para navegar el mapa de asientos
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        return;
      }

      e.preventDefault();

      if (e.key === ' ') {
        if (focusedSeat !== null) {
          handleSeatClick(focusedSeat);
        }
        return;
      }

      setFocusedSeat(prev => {
        const current = prev || 1;
        let next = current;

        switch (e.key) {
          case 'ArrowLeft':
            next = current - 1;
            if (next < 1) next = capacity;
            break;
          case 'ArrowRight':
            next = current + 1;
            if (next > capacity) next = 1;
            break;
          case 'ArrowUp':
            next = current - 10;
            if (next < 1) next = capacity + next;
            if (next < 1) next = 1;
            break;
          case 'ArrowDown':
            next = current + 10;
            if (next > capacity) next = next - capacity;
            if (next > capacity) next = capacity;
            break;
        }
        return next;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [capacity, handleSeatClick, focusedSeat]);

  // Generar matriz de asientos
  const seats = [];
  for (let i = 1; i <= capacity; i++) {
    let status = 'available';
    if (soldSeats.includes(i) || realtimeOccupied.includes(i)) {
      status = 'occupied';
    } else if (selectedSeats.includes(i)) {
      status = 'selected';
    } else if (blockedSeats[i] && (!socket || blockedSeats[i].socketId !== socket.id)) {
      status = 'blocked';
    }
    seats.push(
      <Seat 
        key={i} 
        seatNumber={i} 
        status={status} 
        onClick={handleSeatClick} 
        flashing={flashingSeats[i] || false}
        isFocused={focusedSeat === i}
      />
    );
  }

  // Estadísticas rápidas
  const availableCount = seats.filter((_, i) => {
    const num = i + 1;
    return !soldSeats.includes(num) && !realtimeOccupied.includes(num) && !selectedSeats.includes(num) &&
      !(blockedSeats[num] && (!socket || blockedSeats[num].socketId !== socket?.id));
  }).length;

  return (
    <div className="w-full max-w-4xl mx-auto mt-6">
      {/* Contenedor principal */}
      <div
        className="rounded-[2rem] overflow-hidden bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative group"
      >
        {/* Barra superior con stats */}
        <div className="px-8 py-5 border-b border-slate-700/50 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-800/20">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <svg className="w-4 h-4 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
              Mapa de Sala
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold text-slate-400 bg-slate-950/80 border border-slate-700/50 font-mono shadow-inner tracking-wider">
              ATAJOS: [←↑↓→] MOVER • [ESPACIO] SELECCIONAR
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="text-slate-400">
              <span className="text-green-400 font-bold">{availableCount}</span> disponibles
            </span>
            <span className="text-slate-400">
              <span className="text-yellow-400 font-bold">{selectedSeats.length}</span> seleccionados
            </span>
            <span className="text-slate-400">
              <span className="text-red-400 font-bold">{soldSeats.length}</span> ocupados
            </span>
          </div>
        </div>

        <div className="p-6">
          {/* Pantalla de cine con Reflejo de Proyección */}
          <div className="relative mb-16 mt-4">
            {/* Resplandor superior de la pantalla */}
            <div
              className="w-3/4 mx-auto h-6 rounded-b-[100px] border-b-2 border-blue-400/80 flex justify-center relative overflow-hidden"
              style={{
                background: 'linear-gradient(to bottom, rgba(30, 41, 59, 0.4), rgba(59, 130, 246, 0.15))',
                boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3), inset 0 -4px 12px rgba(59,130,246,0.2)',
              }}
            >
              {/* Haz de luz de proyección */}
              <div 
                className="absolute inset-0 opacity-40 bg-gradient-to-t from-transparent via-blue-500/20 to-blue-400/30"
                style={{ filter: 'blur(2px)' }}
              />
            </div>
            {/* Proyección de Luz Difusa en la Sala */}
            <div 
              className="w-1/2 mx-auto h-24 absolute left-1/2 -translate-x-1/2 top-6 pointer-events-none rounded-full"
              style={{
                background: 'radial-gradient(ellipse at top, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 50%, transparent 80%)',
                filter: 'blur(15px)'
              }}
            />
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-blue-400 text-2xs font-black tracking-[0.3em] uppercase bg-slate-950/60 border border-blue-500/20 px-3 py-1 rounded-full backdrop-blur-md shadow-lg shadow-blue-500/10">
              Pantalla / Escenario
            </span>
          </div>

          {/* Grid de asientos con Perspectiva 3D */}
          <div 
            className="mb-10 max-w-3xl mx-auto" 
            style={{ perspective: '900px' }}
          >
            <div 
              className="flex flex-wrap justify-center gap-2"
              style={{
                transform: 'rotateX(8deg)',
                transformStyle: 'preserve-3d',
              }}
            >
              {seats}
            </div>
          </div>

          {/* Leyenda */}
          <Legend />
        </div>
      </div>
    </div>
  );
}
