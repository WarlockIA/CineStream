import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTicket } from '../context/TicketContext';
import { useNavigate } from 'react-router-dom';
import { Ticket, Calendar, Home, MapPin, Users, Download, Search, X, ZoomIn, CheckCircle, Clock, AlertCircle, FileText, Film } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { toastSuccess, toastError, toastInfo } from '../utils/toastHelper';
import { io } from 'socket.io-client';

// ─── Badge de estado del ticket ───────────────────────────────────────────────
const StatusBadge = ({ isUsed, paymentStatus, isExpired, ticketStatus }) => {
  if (ticketStatus === 'cancelled') return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
      style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
      <AlertCircle className="w-3 h-3" />
      Cancelado
    </span>
  );
  if (isUsed) return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
      style={{ background: 'rgba(107,114,128,0.2)', color: '#9ca3af', border: '1px solid rgba(107,114,128,0.3)' }}>
      <AlertCircle className="w-3 h-3" />
      Utilizado
    </span>
  );
  if (isExpired) return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
      style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
      <AlertCircle className="w-3 h-3" />
      Expirado
    </span>
  );
  if (paymentStatus === 'pending') return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
      style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
      <Clock className="w-3 h-3" />
      Pendiente
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
      style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
      <CheckCircle className="w-3 h-3" />
      Válido
    </span>
  );
};

// ─── Skeleton Card ────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="rounded-2xl overflow-hidden border border-slate-800 animate-pulse"
    style={{ background: '#111827' }}>
    <div className="flex gap-4 p-5 border-b border-slate-800">
      <div className="skeleton w-16 h-24 rounded-xl shrink-0" />
      <div className="flex-1 space-y-3 py-1">
        <div className="skeleton h-5 w-4/5 rounded-lg" />
        <div className="skeleton h-4 w-3/5 rounded-lg" />
        <div className="skeleton h-4 w-2/5 rounded-lg" />
      </div>
    </div>
    <div className="p-5 space-y-3">
      <div className="flex justify-between">
        <div className="skeleton h-4 w-24 rounded-lg" />
        <div className="skeleton h-4 w-16 rounded-lg" />
      </div>
      <div className="flex justify-between">
        <div className="skeleton h-4 w-20 rounded-lg" />
        <div className="skeleton h-4 w-20 rounded-lg" />
      </div>
      <div className="skeleton h-20 w-full rounded-xl mt-2" />
    </div>
  </div>
);

// ─── Modal QR ampliado ────────────────────────────────────────────────────────
const QRModal = ({ qr, title, subtitle, info, color = 'rgba(59,130,246,0.3)', glow = 'rgba(59,130,246,0.15)', onClose }) => (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
    style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    onClick={onClose}
  >
    <div
      className="rounded-3xl overflow-hidden max-w-xs w-full"
      style={{ background: '#111827', border: `1px solid ${color}`, boxShadow: `0 0 60px ${glow}` }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest">{subtitle}</p>
          <p className="text-white font-bold text-sm mt-0.5 truncate max-w-[200px]">{title}</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-800 transition-colors">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
      {/* QR */}
      <div className="p-6 flex flex-col items-center">
        <div className="bg-white p-4 rounded-2xl mb-4"
          style={{ boxShadow: `0 0 0 8px ${color.replace('0.3', '0.08')}` }}>
          <img src={qr} alt="QR Ampliado" className="w-56 h-56 object-contain" />
        </div>
        <p className="text-slate-400 text-xs text-center leading-relaxed max-w-[220px]">
          {info}
        </p>
      </div>
      <div className="px-5 pb-5">
        <button onClick={onClose}
          className="w-full py-3 rounded-xl font-bold text-sm transition-all"
          style={{ background: '#1E2A3B', color: '#fff', border: '1px solid #334155' }}>
          Cerrar
        </button>
      </div>
    </div>
  </div>
);


// Helper to retrieve specific high-quality Unsplash images for each snack type
const getSnackImage = (name) => {
  const lowercaseName = (name || '').toLowerCase();
  
  if (lowercaseName.includes('mega')) {
    return '/cinema_combo_premium.png';
  }
  if (lowercaseName.includes('nacho')) {
    return '/cinema_combo_nachos.png';
  }
  if (lowercaseName.includes('pareja') || lowercaseName.includes('duo') || lowercaseName.includes('dúo')) {
    return '/cinema_combo_pareja.png';
  }
  if (lowercaseName.includes('personal')) {
    return '/cinema_combo_personal.png';
  }
  if (lowercaseName.includes('pipoca') || lowercaseName.includes('popcorn') || lowercaseName.includes('palomita')) {
    return '/cinema_popcorn_classic.png';
  }
  if (lowercaseName.includes('refresco') || lowercaseName.includes('soda') || lowercaseName.includes('bebida') || lowercaseName.includes('gaseosa') || lowercaseName.includes('jugo')) {
    return '/cinema_soda_fountain.png';
  }
  if (lowercaseName.includes('hot dog') || lowercaseName.includes('hotdog') || lowercaseName.includes('pancho') || lowercaseName.includes('perro caliente')) {
    return '/cinema_hot_dog.png';
  }
  if (lowercaseName.includes('chocolate') || lowercaseName.includes('choc') || lowercaseName.includes('dulce') || lowercaseName.includes('bombón') || lowercaseName.includes('bombon')) {
    return '/cinema_chocolate.png';
  }
  if (lowercaseName.includes('combo')) {
    return '/cinema_combo_premium.png';
  }
  
  // Default movie snack image
  return '/cinema_combo_premium.png';
};

// ─── Ticket Card ──────────────────────────────────────────────────────────────
const TicketCard = ({ ticket, onCancelTicket }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showSnacksQR, setShowSnacksQR] = useState(false);
  const printRef = useRef(null);

  const movie    = ticket.Function?.Movie;
  const room     = ticket.Function?.Room;
  const hasSeats = ticket.seatNumbers && ticket.seatNumbers.length > 0;

  const dateStr  = ticket.Function?.startTime 
    ? new Date(ticket.Function.startTime).toLocaleString('es-BO', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit',
      })
    : new Date(ticket.createdAt).toLocaleString('es-BO', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit',
      });

  const dateShort = ticket.Function?.startTime
    ? new Date(ticket.Function.startTime).toLocaleString('es-BO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : new Date(ticket.createdAt).toLocaleString('es-BO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    toastInfo('Generando PDF...');

    try {
      // 1. Dar tiempo al navegador para renderizar el nodo oculto
      await new Promise(resolve => setTimeout(resolve, 400));
      
      if (!printRef.current) throw new Error("Contenedor del ticket no encontrado");

      // 2. Capturar el contenedor en un canvas usando html2canvas
      const canvas = await html2canvas(printRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2, // Alta resolución
        backgroundColor: '#0f172a' // Fondo del ticket
      });

      const imgData = canvas.toDataURL('image/png');

      // 3. Insertar el canvas en un documento jsPDF
      // 3. Insertar el canvas en un documento jsPDF
      const pdfWidth = 80; // Ancho fijo del ticket de 80mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pdfWidth, pdfHeight] });
      
      // Fondo base en caso de espacios vacíos
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      // 4. Descargar
      pdf.save(`Ticket_${(movie?.title || 'confiteria').replace(/\s+/g, '_')}_${ticket.transactionId.slice(-6)}.pdf`);
      toastSuccess('¡PDF descargado!');
    } catch (err) {
      console.error('Error al hacer PDF:', err);
      toastError('Fallo al generar PDF. Reintenta en unos segundos.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      {/* ─── Contenedor Oculto para Generación PDF con html2canvas ─── */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div 
          ref={printRef}
          className="w-[302px] bg-slate-900 text-white flex flex-col font-sans"
          style={{ padding: '0', margin: '0' }}
        >
          {/* Banda superior de color */}
          <div className="h-6 w-full" style={{ background: !hasSeats ? 'linear-gradient(90deg, #F59E0B, #D97706)' : 'linear-gradient(90deg, #3B82F6, #7C3AED)' }} />
          
          <div className="p-6 flex flex-col items-center">
            <h2 className="text-2xl font-black mb-1 tracking-tight">CineStream</h2>
            <p className="text-slate-400 text-xs tracking-widest uppercase mb-6 border-b border-slate-700 pb-2 w-full text-center">
              {hasSeats ? 'Boleto Digital' : 'Comprobante de Dulcería'}
            </p>

            {hasSeats ? (
              <>
                <h3 className="text-lg font-bold text-center leading-tight mb-1 px-2">{movie?.title || 'Película'}</h3>
                <p className="text-blue-400 text-sm font-semibold mb-6">{room?.name || 'Sala'}</p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-center leading-tight mb-1 px-2 text-amber-400">Solo Dulcería</h3>
                <p className="text-slate-400 text-xs font-semibold mb-6">Retiro Rápido Express</p>
              </>
            )}

            <div className="w-full space-y-4 mb-6 border-t border-b border-slate-800/80 py-4">
              <div>
                <p className="text-slate-500 text-[10px] font-bold">FECHA Y HORA</p>
                <p className="font-medium text-sm">{dateShort}</p>
              </div>
              {hasSeats && (
                <div>
                  <p className="text-slate-500 text-[10px] font-bold">ASIENTOS</p>
                  <p className="font-medium text-sm">{ticket.seatNumbers?.join(', ')}</p>
                </div>
              )}
              <div>
                <p className="text-slate-500 text-[10px] font-bold">TOTAL PAGADO</p>
                <p className="font-bold text-emerald-400 text-sm">Bs. {ticket.totalPrice}</p>
              </div>
            </div>

            {hasSeats && (
              <>
                <p className="text-slate-400 text-[10px] uppercase mb-3 font-semibold">Código de Acceso</p>
                <div className="bg-white p-2.5 rounded-2xl mb-4 inline-block shadow-inner">
                  <img src={ticket.qrBase64 || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticket.transactionId}`} alt="QR Acceso" className="w-32 h-32 object-contain" />
                </div>
                <p className="text-slate-500 text-[9px] text-center px-4 mb-4">Presenta este código al portero en la puerta de acceso.</p>
              </>
            )}

            {/* Bloque de snacks en el PDF */}
            {ticket.snacks && ticket.snacks.length > 0 && (
              <div className="w-full flex flex-col items-center border-t border-dashed border-slate-800 pt-4 mt-2">
                <p className="text-xs font-black text-amber-500 uppercase tracking-widest mb-3">Retiro de Confitería</p>
                <div className="w-full space-y-1.5 mb-4 text-xs font-mono">
                  {ticket.snacks.map((snack, idx) => (
                    <div key={idx} className="flex justify-between px-2 text-slate-350 w-full">
                      <span>{snack.quantity}x {snack.name}</span>
                      <span className="font-mono text-white">Bs. {(snack.price * snack.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <p className="text-slate-400 text-[10px] uppercase mb-3 font-semibold">Express Pickup QR</p>
                <div className="bg-white p-2.5 rounded-2xl mb-4 inline-block shadow-inner">
                  <img src={ticket.snacksQrBase64 || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticket.transactionId}`} alt="Snacks QR" className="w-32 h-32 object-contain" />
                </div>
                <p className="text-slate-500 text-[9px] text-center px-4 mb-4">Muestra este código en el CandyBar para retirar tus snacks.</p>
              </div>
            )}
            
            <p className="text-slate-700 text-[8px] font-mono font-medium mt-2">TXN: {ticket.transactionId}</p>
          </div>
        </div>
      </div>

      {showQR && (
        <QRModal
          qr={ticket.qrBase64 || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticket.transactionId}`}
          title={movie?.title || 'Acceso'}
          subtitle="Código de Acceso"
          info="Muestra este código al portero para acceder a la sala."
          onClose={() => setShowQR(false)}
        />
      )}

      {showSnacksQR && (
        <QRModal
          qr={ticket.snacksQrBase64 || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticket.transactionId}`}
          title={movie?.title ? `Snacks - ${movie.title}` : 'Retiro de Snacks'}
          subtitle="Express Pickup QR"
          info="Muestra este código en el CandyBar para retirar tus snacks."
          color="rgba(245,158,11,0.3)"
          glow="rgba(245,158,11,0.15)"
          onClose={() => setShowSnacksQR(false)}
        />
      )}

      <div className="card-cinema overflow-hidden flex flex-col animate-fade-in animate-scale-in">

        {/* Banda de estado */}
        <div className="h-1" style={{
          background: ticket.status === 'cancelled' ? '#ef4444'
            : ticket.isUsed ? '#6b7280'
            : ticket.isExpired ? '#ef4444'
            : ticket.paymentStatus === 'pending' ? '#f59e0b'
            : 'linear-gradient(90deg, #3B82F6, #7C3AED)'
        }} />

        {/* Info película / confitería */}
        <div className="flex gap-4 p-5 border-b border-slate-800/80">
          {hasSeats && movie?.posterUrl ? (
            <img
              src={`http://localhost:3000${movie.posterUrl}`}
              alt="Poster"
              loading="lazy"
              className="w-16 h-24 object-cover rounded-xl shrink-0"
              style={{ opacity: 0, filter: 'blur(4px)', transition: 'opacity 0.4s ease, filter 0.4s ease' }}
              onLoad={e => { e.target.style.opacity = '1'; e.target.style.filter = 'blur(0)'; }}
            />
          ) : (
            <img
              src="/cinema_combo_premium.png"
              alt=""
              className="w-16 h-24 object-contain rounded-xl shrink-0 border border-amber-500/30 bg-slate-950"
              style={{ opacity: 0, filter: 'blur(4px)', transition: 'opacity 0.4s ease, filter 0.4s ease' }}
              onLoad={e => { e.target.style.opacity = '1'; e.target.style.filter = 'blur(0)'; }}
            />
          )}

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-base leading-tight mb-2 truncate">
              {hasSeats ? (movie?.title || 'Película Desconocida') : 'Retiro de Dulcería Express'}
            </h3>
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-slate-400 text-xs">
                <Calendar className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                {dateStr}
              </p>
              <p className="flex items-center gap-1.5 text-slate-400 text-xs">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                {hasSeats ? (room?.name || 'N/A') : 'Taquilla / CandyBar'}
              </p>
              <p className="flex items-center gap-1.5 text-slate-400 text-xs">
                <Users className="w-3.5 h-3.5 shrink-0 text-green-400" />
                {hasSeats ? (
                  <>Asientos: <span className="text-white font-semibold ml-0.5">{ticket.seatNumbers?.join(', ')}</span></>
                ) : (
                  <>Detalle: <span className="text-white font-semibold ml-0.5">Venta Confitería</span></>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Detalles y QR */}
        <div className="p-5 flex-1 flex flex-col gap-4">
          {/* Precio + Status */}
          <div className="flex items-center justify-between">
            <span className="text-emerald-400 font-bold text-lg">Bs. {ticket.totalPrice}</span>
            <StatusBadge isUsed={ticket.isUsed} paymentStatus={ticket.paymentStatus} isExpired={ticket.isExpired} ticketStatus={ticket.status} />
          </div>

          {/* QR Thumbnail + acciones (Solo si tiene asientos) */}
          {hasSeats && (
            <div className="flex items-center gap-4 p-3 rounded-xl"
              style={{ background: '#1E2A3B', border: '1px solid rgba(51,65,85,0.5)' }}>

              {/* Thumbnail QR clickeable */}
              <button
                onClick={() => ticket.status !== 'cancelled' && !ticket.isUsed && !ticket.isExpired && setShowQR(true)}
                disabled={ticket.status === 'cancelled' || ticket.isUsed || ticket.isExpired}
                className="shrink-0 bg-white p-1.5 rounded-xl transition-all"
                style={{
                  width: '72px', height: '72px',
                  border: (ticket.status === 'cancelled' || ticket.isUsed || ticket.isExpired) ? '2px solid rgba(107,114,128,0.4)' : '2px solid rgba(59,130,246,0.5)',
                  filter: (ticket.status === 'cancelled' || ticket.isUsed || ticket.isExpired) ? 'grayscale(1) opacity(0.5)' : 'none',
                  cursor: (ticket.status === 'cancelled' || ticket.isUsed || ticket.isExpired) ? 'not-allowed' : 'pointer',
                }}
              >
                <img src={ticket.qrBase64 || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticket.transactionId}`} alt="QR" className="w-full h-full object-contain" />
              </button>

              <div className="flex-1 min-w-0">
                {ticket.status === 'cancelled' ? (
                  <p className="text-red-400/90 text-xs font-medium leading-relaxed">
                    Boleto cancelado y reembolsado.
                  </p>
                ) : ticket.isUsed ? (
                  <p className="text-red-400 text-xs font-medium leading-relaxed">
                    Ticket ya usado en puerta.
                  </p>
                ) : ticket.isExpired ? (
                  <p className="text-red-400 text-xs font-medium leading-relaxed">
                    Boleto expirado.
                  </p>
                ) : (
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Toca el QR para ver el pase de sala.
                  </p>
                )}
                {ticket.status !== 'cancelled' && !ticket.isUsed && !ticket.isExpired && (
                  <button onClick={() => setShowQR(true)}
                    className="flex items-center gap-1.5 text-blue-400 text-[10.5px] font-bold mt-2 hover:text-blue-300 transition-colors bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-lg border border-blue-500/20">
                    <ZoomIn className="w-3.5 h-3.5" /> Ver boleto
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Bloque de Express Pickup QR Confitería */}
          {(ticket.snacksQrBase64 || (ticket.snacks && ticket.snacks.length > 0)) && (
            <div className="flex flex-col gap-3 p-3.5 rounded-2xl relative overflow-hidden"
              style={{ 
                background: 'linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(217,119,6,0.03) 100%)', 
                border: '1px solid rgba(245,158,11,0.2)'
              }}>
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#111827] border-r border-slate-800" />
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#111827] border-l border-slate-800" />
              
              <div className="border-b border-dashed border-slate-850 pb-2 mb-1 text-center">
                <span className="text-[9px] font-extrabold text-amber-500 uppercase tracking-widest">🍿 Express Pickup QR 🍿</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => ticket.status !== 'cancelled' && !ticket.isSnacksDelivered && !ticket.isExpired && setShowSnacksQR(true)}
                  disabled={ticket.status === 'cancelled' || ticket.isSnacksDelivered || ticket.isExpired}
                  className="shrink-0 bg-white p-1.5 rounded-xl transition-all flex items-center justify-center"
                  style={{
                    width: '64px', height: '64px',
                    border: (ticket.status === 'cancelled' || ticket.isSnacksDelivered || ticket.isExpired) ? '2px solid rgba(107,114,128,0.4)' : '2px solid rgba(245,158,11,0.5)',
                    filter: (ticket.status === 'cancelled' || ticket.isSnacksDelivered || ticket.isExpired) ? 'grayscale(1) opacity(0.5)' : 'none',
                    cursor: (ticket.status === 'cancelled' || ticket.isSnacksDelivered || ticket.isExpired) ? 'not-allowed' : 'pointer',
                  }}
                >
                  <img src={ticket.snacksQrBase64 || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticket.transactionId}`} alt="Snacks QR" className="w-full h-full object-contain rounded-lg" />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">CandyBar</span>
                    {ticket.status === 'cancelled' ? (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 uppercase">Revocado</span>
                    ) : ticket.isSnacksDelivered ? (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 uppercase">✓ Entregado</span>
                    ) : ticket.isExpired ? (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 uppercase">Expirado</span>
                    ) : (
                      <span className="text-[8px] font-extrabold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 uppercase animate-status-pending border border-amber-500/30 tracking-wider">⚡ Pendiente</span>
                    )}
                  </div>
                  
                  <div className="space-y-2 mt-2">
                    {ticket.snacks ? ticket.snacks.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-gradient-to-r from-slate-900/60 to-slate-950/60 p-2 rounded-xl border border-slate-800/80 hover:border-amber-500/20 transition-all duration-300">
                        <div className="relative w-[60px] h-[60px] rounded-lg overflow-hidden shrink-0 border border-slate-700/40 bg-slate-950 flex items-center justify-center">
                          <img 
                            src={getSnackImage(s.name)} 
                            alt="" 
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-slate-100 text-xs font-bold truncate leading-tight">
                            {s.name}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-amber-500 font-extrabold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              Cant: {s.quantity}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              CandyBar
                            </span>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <p className="text-slate-400 text-[10px] leading-tight">Snacks</p>
                    )}
                  </div>

                  {ticket.status !== 'cancelled' && !ticket.isSnacksDelivered && !ticket.isExpired && (
                    <button onClick={() => setShowSnacksQR(true)}
                      className="flex items-center gap-1.5 text-amber-500 text-[10.5px] font-bold mt-2.5 hover:text-amber-400 transition-colors bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      <ZoomIn className="w-3.5 h-3.5" /> Ampliar código
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Botón PDF */}
          <button
            onClick={handleDownloadPDF}
            disabled={isDownloading || ticket.status === 'cancelled'}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-55 mt-auto"
            style={{ background: '#1E2A3B', color: '#94a3b8', border: '1px solid #334155' }}
            onMouseEnter={e => { if (!isDownloading && ticket.status !== 'cancelled') { e.currentTarget.style.borderColor = '#3B82F6'; e.currentTarget.style.color = '#60a5fa'; }}}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#94a3b8'; }}
          >
            {isDownloading ? (
              <><div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />Generando PDF...</>
            ) : (
              <><FileText className="w-4 h-4" />Descargar PDF</>
            )}
          </button>

          {/* Botón Cancelar Reserva */}
          {ticket.status !== 'cancelled' && !ticket.isUsed && !ticket.isExpired && !ticket.isSnacksDelivered &&
           (!ticket.functionId || (new Date(ticket.Function?.startTime).getTime() - Date.now() > 2 * 60 * 60 * 1000)) && (
            <button
              onClick={() => onCancelTicket(ticket)}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all text-red-400 border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 hover:border-red-500/40 cursor-pointer"
            >
              <X className="w-4 h-4" /> {ticket.functionId ? 'Cancelar Reserva' : 'Cancelar Pedido'}
            </button>
          )}

          {/* ID de transacción */}
          <p className="text-slate-700 text-[10px] font-mono truncate text-center">
            Txn: {ticket.transactionId}
          </p>
        </div>
      </div>
    </>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function MyTickets() {
  const { token, user, logout } = useAuth();
  const { clearSeats } = useTicket();
  const navigate  = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };
  const [tickets, setTickets]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState('');
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past'

  const [cancellingTicket, setCancellingTicket] = useState(null);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [generatedCoupon, setGeneratedCoupon] = useState(null);

  const handleCancelTicket = async () => {
    if (!cancellingTicket) return;
    setIsSubmittingCancel(true);
    try {
      const res = await axios.post(`http://localhost:3000/api/bookings/${cancellingTicket.id}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toastSuccess('¡Ticket cancelado con éxito!');
      setGeneratedCoupon(res.data.data);
      setTickets(prev => prev.map(t => t.id === cancellingTicket.id ? { ...t, status: 'cancelled' } : t));
      setCancellingTicket(null);
    } catch (err) {
      toastError(err.response?.data?.message || 'Error al cancelar el ticket');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await axios.get('http://localhost:3000/api/bookings/my-tickets', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTickets(res.data.data);
      } catch {
        setError('No pudimos cargar tu historial de tickets.');
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [token]);

  useEffect(() => {
    const socket = io('http://localhost:3000');
    socket.on('connect', () => {
      console.log('🔌 Connected to WebSockets in MyTickets');
    });
    socket.on('snacks:delivered', ({ ticketId }) => {
      setTickets(prev => prev.map(t => {
        if (t.id === ticketId) {
          toastSuccess('🍿 ¡Tus snacks acaban de ser entregados! Disfruta la función.');
          return { ...t, isSnacksDelivered: true };
        }
        return t;
      }));
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  // 1. Enriquecer los tickets con el cálculo de expiración (Algoritmo de Vigencia)
  const enrichedTickets = tickets.map(ticket => {
    if (!ticket.functionId) {
      return { ...ticket, isExpired: false };
    }
    const startTime = new Date(ticket.Function?.startTime).getTime();
    const durationMs = (ticket.Function?.Movie?.duration || 120) * 60000;
    // Si la fecha actual supera el inicio + duración, el ticket expiró.
    const isExpired = Date.now() > (startTime + durationMs);
    return { ...ticket, isExpired };
  });
 
  // 2. Módulo de Lealtad (Películas únicas disfrutadas)
  const pastTickets = enrichedTickets.filter(t => t.isExpired || t.isUsed);
  const uniqueMoviesWatched = new Set(pastTickets.map(t => t.Function?.Movie?.id).filter(Boolean)).size;
 
  // 3. Filtrar por Pestaña
  const filteredByTab = enrichedTickets.filter(t => {
    if (activeTab === 'upcoming') {
      if (!t.functionId) return !t.isSnacksDelivered && t.status !== 'cancelled';
      return !t.isExpired && !t.isUsed;
    }
    if (!t.functionId) return t.isSnacksDelivered || t.status === 'cancelled';
    return t.isExpired || t.isUsed;
  });
 
  // 4. Filtrar por Búsqueda
  const finalFiltered = filteredByTab.filter(t => {
    if (!search) return true;
    if (!t.functionId) return 'dulceria'.includes(search.toLowerCase()) || 'snacks'.includes(search.toLowerCase());
    return t.Function?.Movie?.title?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">

      {/* ── Navbar ── */}
      <nav className="navbar nav-premium flex justify-between items-center sticky top-0 z-50">
        {/* Logo */}
        <div className="flex items-center gap-3 select-none">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 p-0.5 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            <div className="w-full h-full bg-[#070B14] rounded-[9px] flex items-center justify-center">
              <Film className="w-5 h-5 text-blue-500 animate-pulse" />
            </div>
          </div>
          <h1 className="logo-text-premium leading-none">
            CineStream
          </h1>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/movies')}
            className="btn-tickets-glass flex items-center gap-1.5"
          >
            <Film className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cartelera</span>
          </button>

          <button
            onClick={() => { clearSeats(); navigate('/candybar'); }}
            className="btn-candybar-glow"
          >
            <span className="inline-block animate-pulse mr-1">🍿</span> <span className="hidden sm:inline">Dulcería</span>
          </button>

          <button
            onClick={() => navigate('/my-tickets')}
            className="btn-tickets-glass flex items-center gap-1.5"
          >
            <Ticket className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mis Compras</span>
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-800" />

          {/* User info + avatar (Clickable to Profile) */}
          <div 
            onClick={() => navigate('/profile')}
            className="vip-profile-card"
          >
            <div className="vip-avatar-container">
              <div className="vip-avatar-content">
                {user?.fullname ? user.fullname.charAt(0).toUpperCase() : 'C'}
              </div>
            </div>
            <div className="hidden md:flex vip-profile-info">
              <span className="vip-profile-name">
                {user?.fullname || 'Cliente'}
              </span>
              <span className="vip-profile-badge">
                {user?.role === 'admin' ? (
                  <><span className="vip-profile-crown">🛠️</span> Administrador</>
                ) : user?.role === 'staff' ? (
                  <><span className="vip-profile-crown">💼</span> Personal POS</>
                ) : user?.role === 'porter' ? (
                  <><span className="vip-profile-crown">🔍</span> Portero</>
                ) : (
                  <><span className="vip-profile-crown">👑</span> Miembro Socio</>
                )}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="logout-btn-hud flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">

        {/* Módulo de Lealtad (Premium Banner) */}
        {!loading && uniqueMoviesWatched > 0 && (
          <div className="mb-8 rounded-2xl p-5 flex items-center justify-between"
            style={{ background: 'linear-gradient(90deg, rgba(59,130,246,0.1), rgba(124,58,237,0.1))', border: '1px solid rgba(59,130,246,0.2)' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-500/20 text-blue-400">
                <Ticket className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">CineStream Rewards</h3>
                <p className="text-slate-400 text-sm">Has disfrutado de <span className="text-emerald-400 font-bold">{uniqueMoviesWatched}</span> películas con nosotros. ¡Gracias por tu preferencia!</p>
              </div>
            </div>
          </div>
        )}

        {/* Pestañas (Tabs) y Buscador */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          {/* Tabs */}
          <div className="flex items-center gap-2 bg-slate-800/50 p-1.5 rounded-xl border border-slate-700/50">
            <button 
              onClick={() => setActiveTab('upcoming')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'upcoming' 
                  ? 'bg-brand-primary text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Próximas Funciones
            </button>
            <button 
              onClick={() => setActiveTab('past')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'past' 
                  ? 'bg-slate-700 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Historial Pasado
            </button>
          </div>

          {!loading && tickets.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por película..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-9 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
                style={{ background: '#1E2A3B', border: '1px solid #334155', minWidth: '220px' }}
                onFocus={e => e.target.style.borderColor = '#3B82F6'}
                onBlur={e => e.target.style.borderColor = '#334155'}
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Contenido principal */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Error al cargar</h3>
            <p className="text-slate-400 mb-6">{error}</p>
            <button onClick={() => window.location.reload()}
              className="btn-primary px-6 py-3 text-sm">Reintentar</button>
          </div>
        ) : finalFiltered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
              style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)' }}>
              <Ticket className="w-12 h-12 text-slate-600" />
            </div>
            {search ? (
              <>
                <h3 className="text-xl font-bold text-white mb-2">Sin resultados</h3>
                <p className="text-slate-400 mb-5">No encontramos tickets para "{search}"</p>
                <button onClick={() => setSearch('')} className="btn-secondary px-5 py-2.5 text-sm">
                  Limpiar búsqueda
                </button>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {activeTab === 'upcoming' ? 'No tienes próximas funciones' : 'No tienes historial pasado'}
                </h3>
                <p className="text-slate-400 mb-6 max-w-xs">
                  {activeTab === 'upcoming' 
                    ? 'Explora la cartelera y reserva tu próxima película para que aparezca aquí.' 
                    : 'Aún no has disfrutado de ninguna película con nosotros.'}
                </p>
                {activeTab === 'upcoming' && (
                  <button onClick={() => navigate('/movies')} className="btn-primary px-6 py-3">
                    Ver Cartelera
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {finalFiltered.map(ticket => (
              <TicketCard key={ticket.id} ticket={ticket} onCancelTicket={setCancellingTicket} />
            ))}
          </div>
        )}

        {/* Modal de confirmación de cancelación */}
        {cancellingTicket && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-2">¿Confirmar Cancelación?</h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Esta acción cancelará tu reserva para <strong>{cancellingTicket.Function?.Movie?.title}</strong>. 
                Se liberarán tus asientos y recibirás un cupón de reembolso por el 100% (<strong>Bs. {cancellingTicket.totalPrice}</strong>) válido por 30 días.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setCancellingTicket(null)}
                  disabled={isSubmittingCancel}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-colors animate-keypress"
                >
                  Volver
                </button>
                <button 
                  onClick={handleCancelTicket}
                  disabled={isSubmittingCancel}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm bg-red-600 hover:bg-red-500 text-white transition-colors flex items-center justify-center gap-2 animate-keypress"
                >
                  {isSubmittingCancel ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Cupón Generado */}
        {generatedCoupon && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
            <div className="bg-slate-900 border border-blue-500/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">¡Cancelación Exitosa!</h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Hemos liberado tus asientos y generado tu cupón de reembolso.
              </p>

              {/* Código del cupón */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-6 relative overflow-hidden group">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Código del Cupón</p>
                <p className="text-2xl font-black text-white tracking-wider select-all">{generatedCoupon.couponCode}</p>
                <p className="text-lg font-bold text-emerald-400 mt-1">Bs. {generatedCoupon.couponValue}</p>
                <p className="text-[10px] text-slate-500 mt-2">Vence el: {new Date(generatedCoupon.expiresAt).toLocaleDateString()}</p>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(generatedCoupon.couponCode);
                    toastSuccess('¡Código copiado al portapapeles!');
                  }}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors animate-keypress"
                >
                  Copiar Código
                </button>
                <button 
                  onClick={() => setGeneratedCoupon(null)}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-750 transition-colors animate-keypress"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
