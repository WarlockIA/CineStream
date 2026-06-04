import React, { useRef, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, Home, Ticket, CheckCircle2, ChevronRight, Calendar, MapPin, Users, DollarSign, Loader2, Printer, Send, Cookie, Popcorn, Film } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toastSuccess, toastError, toastInfo } from '../utils/toastHelper';
import { formatToBoliviaTime } from '../utils/dateHelper';
import { generateTicketQR, generateSnacksQR } from '../utils/qrHelper';

// ─── Animación de confeti CSS ────────────────────────────────────────────────
const ConfettiPiece = ({ style }) => (
  <div className="absolute rounded-sm pointer-events-none" style={style} />
);

const Confetti = () => {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    style: {
      width: `${Math.random() * 8 + 4}px`,
      height: `${Math.random() * 8 + 4}px`,
      left: `${Math.random() * 100}%`,
      top: `-20px`,
      backgroundColor: ['#3B82F6', '#7C3AED', '#F59E0B', '#10B981', '#EC4899', '#60A5FA'][i % 6],
      opacity: Math.random() * 0.8 + 0.2,
      animation: `confettiFall ${Math.random() * 2 + 2}s ease-in ${Math.random() * 1.5}s forwards`,
      transform: `rotate(${Math.random() * 360}deg)`,
    },
  }));

  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(${Math.random() * 720}deg); opacity: 0; }
        }
      `}</style>
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
        {pieces.map(p => <ConfettiPiece key={p.id} style={p.style} />)}
      </div>
    </>
  );
};

// ─── Row de detalle del ticket ────────────────────────────────────────────────
const DetailRow = ({ icon: Icon, label, value, accent = false, className = '' }) => (
  <div className={`flex items-start gap-3 py-3 border-b border-slate-800/80 last:border-0 ${className}`}>
    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
      style={{ background: 'rgba(59,130,246,0.1)' }}>
      <Icon className="w-4 h-4 text-blue-400" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`font-semibold leading-snug ${accent ? 'text-emerald-400 text-lg' : 'text-white'}`}>
        {value}
      </p>
    </div>
  </div>
);

import { useAuth } from '../context/AuthContext';

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ThankYou() {
  const { user, logout } = useAuth();
  const handleLogout = () => { logout(); navigate('/login'); };
  const location = useLocation();
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [qrBase64, setQrBase64] = useState(location.state?.ticketData?.qrBase64 || null);
  const [snacksQrBase64, setSnacksQrBase64] = useState(location.state?.ticketData?.snacksQrBase64 || null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [showDigitalSend, setShowDigitalSend] = useState(false);
  const [digitalContact, setDigitalContact] = useState('');

  // Atajo de teclado (Hotkey) para Taquilla Rápida
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (user?.role !== 'staff' && user?.role !== 'admin') return;

      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable
      );
      if (isTyping) return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigate('/pos');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [user, navigate]);

  const handleSendDigital = () => {
    const contact = digitalContact.trim();
    if (!contact) {
      toastError('Por favor, ingresa un número de WhatsApp o correo electrónico.');
      return;
    }

    const isEmail = /\S+@\S+\.\S+/.test(contact);
    const isPhone = /^\+?[0-9]{7,15}$/.test(contact);

    if (!isEmail && !isPhone) {
      toastError('Ingresa un formato de correo válido o un número de celular válido.');
      return;
    }

    toastSuccess(
      isEmail
        ? `¡Enviado! Se ha enviado el boleto digital ecológico al correo: ${contact} 📧`
        : `¡Enviado! Se ha enviado el boleto digital ecológico a WhatsApp: ${contact} 💬`
    );
    setDigitalContact('');
    setShowDigitalSend(false);
  };

  const ticketData = location.state?.ticketData;

  // Extraer datos con máxima resiliencia (T-12.2)
  // El backend envía campos planos (movieTitle, startTime, roomName) en la raíz
  // y también la estructura anidada booking.function como respaldo.
  const booking = ticketData?.booking || null;
  const func = booking?.function || booking?.Function || null;

  // Prioridad: campo plano del backend → dato anidado → fallback visual
  const movieTitle = ticketData?.movieTitle || func?.Movie?.title || func?.movie?.title || 'Sin título';
  const roomName = ticketData?.roomName || func?.Room?.name || func?.room?.name || 'Sin sala';
  const startTime = ticketData?.startTime || func?.startTime || null;
  const seatNumbers = ticketData?.seatNumbers || booking?.seatNumbers || [];
  const totalPrice = ticketData?.totalPrice || booking?.totalPrice || 0;
  const transactionId = ticketData?.transactionId || booking?.transactionId || 'N/A';
  const snacks = ticketData?.snacks || booking?.snacks || [];
  // isSnackOnlySale: confiar SOLO en el flag del backend
  const isSnackOnlySale = ticketData?.isSnackOnly === true;



  // Generación reactiva de QR (T-10.1)
  useEffect(() => {
    const handleQrGeneration = async () => {
      if (ticketData) {
        setIsGeneratingQR(true);
        if (!qrBase64 && !isSnackOnlySale) {
          const generated = await generateTicketQR(ticketData);
          if (generated) setQrBase64(generated);
        }
        if (!snacksQrBase64 && snacks && snacks.length > 0) {
          const generatedSnacks = await generateSnacksQR(ticketData);
          if (generatedSnacks) setSnacksQrBase64(generatedSnacks);
        }
        setIsGeneratingQR(false);
      }
    };
    handleQrGeneration();
  }, [ticketData, qrBase64, snacksQrBase64, isSnackOnlySale, snacks]);

  // Ocultar confeti después de 4 segundos
  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(t);
  }, []);

  // Redirigir si no hay datos
  if (!ticketData) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-4 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <Ticket className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">No hay datos de ticket</h2>
        <p className="text-slate-400 mb-6 max-w-xs">
          Esta página solo es accesible inmediatamente después de una compra exitosa.
        </p>
        <div className="flex gap-3">
          <button onClick={() => navigate('/my-tickets')}
            className="btn-secondary px-6 py-3 text-sm">
            Mis Tickets
          </button>
          <button onClick={() => navigate('/movies')}
            className="btn-primary px-6 py-3 text-sm">
            Ir a Cartelera
          </button>
        </div>
      </div>
    );
  }

  // Formateo de fecha y hora robusto (T-12.2)
  const formattedDate = startTime
    ? formatToBoliviaTime(startTime)
    : 'Fecha no disponible';

  const formattedDateShort = startTime
    ? new Date(startTime).toLocaleString('es-BO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
    : '---';

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    toastInfo('Generando PDF del ticket...');

    try {
      const hasEntryTicket = !isSnackOnlySale;
      const hasSnacksTicket = snacks && snacks.length > 0;
      
      // Calcular alto dinámico del PDF para evitar recortes si hay muchos productos
      let calculatedHeight = 45; // Margen base superior/inferior y títulos
      
      if (hasEntryTicket) {
        calculatedHeight += 115; // Película, sala, fecha, asientos, y QR de entrada
      }
      
      if (hasSnacksTicket) {
        calculatedHeight += 25; // Cabecera de snacks y espaciado
        if (snacks && snacks.length > 0) {
          snacks.forEach(() => {
            calculatedHeight += 7; // Altura estimada por snack
          });
        }
        calculatedHeight += 55; // QR de confitería y espaciado
      }
      
      calculatedHeight += 30; // Total pagado, transacción, instrucciones y pie de página
      
      const pdfHeight = Math.max(isSnackOnlySale ? 180 : 220, calculatedHeight);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, pdfHeight] });
      const W = 80;

      // ── Fondo oscuro ──
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, W, pdfHeight, 'F');

      // ── Banda de color superior ──
      pdf.setFillColor(isSnackOnlySale ? 245 : 59, isSnackOnlySale ? 158 : 130, isSnackOnlySale ? 11 : 246);
      pdf.rect(0, 0, W, 8, 'F');

      // ── Logo / Nombre ──
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(255, 255, 255);
      pdf.text('CineStream', W / 2, 18, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(148, 163, 184);
      pdf.text(isSnackOnlySale ? 'RECIBO DE DULCERÍA' : 'BOLETO DIGITAL', W / 2, 23, { align: 'center' });

      // ── Separador 1 ──
      pdf.setDrawColor(51, 65, 85);
      pdf.setLineDashPattern([2, 2], 0);
      pdf.line(6, 27, W - 6, 27);

      let y = 34;

      if (hasEntryTicket) {
        // ─── PDF para Boleto de Cine ──────────────────────────────────
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(255, 255, 255);
        const titleLines = pdf.splitTextToSize(movieTitle || 'Película', W - 12);
        pdf.text(titleLines, W / 2, y, { align: 'center' });
        y += titleLines.length * 6;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(96, 165, 250);
        pdf.text(roomName || 'Sala', W / 2, y + 2, { align: 'center' });
        y += 8;

        pdf.setLineDashPattern([2, 2], 0);
        pdf.line(6, y + 2, W - 6, y + 2);
        y += 8;

        const details = [
          { label: 'FECHA Y HORA', value: formattedDateShort || '---' },
          { label: 'ASIENTOS', value: seatNumbers.length > 0 ? seatNumbers.join(', ') : '---' },
        ];

        details.forEach(({ label, value }) => {
          const safeValue = String(value ?? '---');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(6.5);
          pdf.setTextColor(100, 116, 139);
          pdf.text(label, 6, y);
          y += 4;

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.setTextColor(255, 255, 255);
          pdf.text(safeValue, 6, y);
          y += 7;
        });

        // ── QR Code ──
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(148, 163, 184);
        pdf.text('CÓDIGO DE ACCESO A SALA', W / 2, y + 2, { align: 'center' });
        y += 6;

        if (qrBase64) {
          const qrSize = 40;
          const qrX = (W - qrSize) / 2;
          pdf.setFillColor(255, 255, 255);
          pdf.roundedRect(qrX - 2, y - 1, qrSize + 4, qrSize + 4, 2, 2, 'F');
          pdf.addImage(qrBase64, 'PNG', qrX, y, qrSize, qrSize);
          y += qrSize + 6;
        }
      }

      if (hasEntryTicket && hasSnacksTicket) {
        // Separador para la sección de snacks
        pdf.setLineDashPattern([2, 2], 0);
        pdf.line(6, y, W - 6, y);
        pdf.setFillColor(15, 23, 42);
        pdf.circle(-3, y, 5, 'F');
        pdf.circle(W + 3, y, 5, 'F');
        y += 10;
      }

      if (hasSnacksTicket) {
        // ─── PDF para Dulcería ───────────────────────────────────
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(245, 158, 11); // amber
        pdf.text(hasEntryTicket ? 'RETIRO EXPRESS DULCERÍA' : 'PRODUCTOS DE DULCERÍA', W / 2, y, { align: 'center' });
        y += 8;

        if (snacks && snacks.length > 0) {
          snacks.forEach(snack => {
            const name = String(snack.name || 'Producto');
            const qty = snack.quantity || 1;
            const subtotal = `Bs. ${(snack.price * qty).toFixed(2)}`;

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8);
            pdf.setTextColor(255, 255, 255);
            const nameLines = pdf.splitTextToSize(`${qty}x ${name}`, W - 24);
            pdf.text(nameLines, 6, y);
            pdf.setTextColor(245, 158, 11); // amber
            pdf.text(subtotal, W - 6, y, { align: 'right' });
            y += nameLines.length * 5 + 2;
          });
        }

        if (!hasEntryTicket) {
          pdf.setLineDashPattern([2, 2], 0);
          pdf.line(6, y, W - 6, y);
          y += 8;

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(6.5);
          pdf.setTextColor(100, 116, 139);
          pdf.text('FECHA Y HORA', 6, y);
          y += 4;

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.setTextColor(255, 255, 255);
          pdf.text(formattedDateShort || '---', 6, y);
          y += 7;
        } else {
          y += 3;
        }

        // ── QR Code para Dulcería ──
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(148, 163, 184);
        pdf.text('CÓDIGO DE RETIRO DULCERÍA', W / 2, y + 2, { align: 'center' });
        y += 6;

        if (snacksQrBase64) {
          const qrSize = 40;
          const qrX = (W - qrSize) / 2;
          pdf.setFillColor(255, 255, 255);
          pdf.roundedRect(qrX - 2, y - 1, qrSize + 4, qrSize + 4, 2, 2, 'F');
          pdf.addImage(snacksQrBase64, 'PNG', qrX, y, qrSize, qrSize);
          y += qrSize + 6;
        }
      }

      // Separador tipo perforación final
      pdf.setLineDashPattern([2, 2], 0);
      pdf.line(6, y, W - 6, y);
      pdf.setFillColor(15, 23, 42);
      pdf.circle(-3, y, 5, 'F');
      pdf.circle(W + 3, y, 5, 'F');
      y += 6;

      // Detalles de Pago final
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text('TOTAL PAGADO', 6, y);
      pdf.text('TRANSACCIÓN', W - 6, y, { align: 'right' });
      y += 4;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(52, 211, 153); // emerald
      pdf.text(`Bs. ${totalPrice}`, 6, y);
      pdf.setTextColor(255, 255, 255);
      pdf.text(String(transactionId).slice(0, 12).toUpperCase(), W - 6, y, { align: 'right' });
      y += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
      pdf.setTextColor(71, 85, 105);

      const guidelinesText = hasEntryTicket && hasSnacksTicket
        ? 'Presenta el QR azul en la sala y el QR naranja en el CandyBar.'
        : (hasEntryTicket
          ? 'Presenta este QR en la puerta antes de ingresar a la sala.'
          : 'Presenta este QR directamente en el CandyBar.');

      const instrLines = pdf.splitTextToSize(guidelinesText, W - 12);
      pdf.text(instrLines, W / 2, y, { align: 'center' });
      y += instrLines.length * 4 + 4;

      // ── Banda inferior ──
      const bandColor = isSnackOnlySale ? [245, 158, 11] : [59, 130, 246];
      pdf.setFillColor(...bandColor);
      pdf.rect(0, y + 2, W, 4, 'F');

      const filename = isSnackOnlySale
        ? `Recibo_Dulceria_${String(transactionId).slice(-8)}.pdf`
        : `Ticket_CineStream_${String(transactionId).slice(-8)}.pdf`;
      pdf.save(filename);
      toastSuccess('¡PDF generado y descargado!');

    } catch (err) {
      console.error('Error generando PDF:', err);
      toastError('Error al generar el PDF. Intenta de nuevo.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };



  return (
    <div className="min-h-screen bg-brand-dark flex flex-col relative">
      
      {/* ── Navbar ── */}
      <nav className="navbar nav-premium flex justify-between items-center sticky top-0 z-50 no-print w-full">
        <div className="flex items-center gap-3 select-none">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 p-0.5 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            <div className="w-full h-full bg-[#070B14] rounded-[9px] flex items-center justify-center">
              <Film className="w-5 h-5 text-blue-500 animate-pulse" />
            </div>
          </div>
          <h1 className="logo-text-premium leading-none">CineStream</h1>
        </div>
        <div className="flex items-center gap-4">

          {/* Navbar del cliente */}
          {(user?.role !== 'staff' && user?.role !== 'admin') && (<>
            <button onClick={() => navigate('/movies')} className="btn-tickets-glass flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Cartelera</span>
            </button>
            <button onClick={() => navigate('/candybar')} className="btn-tickets-glass flex items-center gap-1.5">
              <Popcorn className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Dulcería</span>
            </button>
            <button onClick={() => navigate('/my-tickets')} className="btn-tickets-glass flex items-center gap-1.5">
              <Ticket className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Mis Compras</span>
            </button>
          </>)}

          {/* Navbar del staff / POS */}
          {(user?.role === 'staff' || user?.role === 'admin') && (
            <button
              onClick={() => navigate('/pos')}
              className="btn-tickets-glass flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span className="hidden sm:inline">Volver a Taquilla</span>
            </button>
          )}

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

      <div className="flex-1 py-10 px-4 flex flex-col items-center w-full animate-fade-in relative">

      {/* Estilos específicos de impresión */}
      <style>{`
        .print-only {
          display: none !important;
        }
        @media print {
          .print-only {
            display: block !important;
          }
          /* Ocultar elementos marcados con no-print */
          .no-print {
            display: none !important;
          }
          
          /* Forzar fondo blanco y eliminar orbes/fondos oscuros */
          body, html, #root {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Contenedor principal de impresión */
          .min-h-screen {
            background: #ffffff !important;
            min-height: auto !important;
            padding: 0 !important;
          }
          
          /* Formatear el ticket para papel térmico de 80mm */
          .printable-ticket {
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 10px !important;
            background: #ffffff !important;
            color: #000000 !important;
            border: none !important;
            box-shadow: none !important;
          }
          
          /* Asegurar colores de alto contraste en todo el ticket */
          .printable-ticket * {
            color: #000000 !important;
            background: transparent !important;
            border-color: #000000 !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          
          /* Asegurar contraste y escala de grises para el QR */
          .printable-ticket img {
            filter: grayscale(1) contrast(1.5) !important;
            margin: 0 auto !important;
            background: #ffffff !important;
            width: 44mm !important;
            height: 44mm !important;
            display: block !important;
          }
          
          /* Línea punteada de separación */
          .printable-ticket .border-b {
            border-bottom: 1px dashed #000000 !important;
          }
          .printable-ticket .border-t {
            border-top: 1px dashed #000000 !important;
          }
          
          /* Ocultar muescas decorativas de color oscuro de fondo */
          .printable-ticket .absolute.rounded-full {
            display: none !important;
          }
          
          /* Ajustar tamaño de página para impresoras de ticket */
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>

      {showConfetti && (
        <div className="no-print">
          <Confetti />
        </div>
      )}

      {/* Orbes decorativos de fondo */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none no-print"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)' }} />
      <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full pointer-events-none no-print"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)' }} />

      {/* ── Header de éxito ── */}
      <div className="flex flex-col items-center text-center mb-10 z-10 animate-slide-up no-print">
        <div className="relative mb-5">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          </div>
          {/* Anillo de pulso */}
          <div className="absolute inset-0 rounded-3xl animate-ping"
            style={{ background: 'rgba(16,185,129,0.15)', animationDuration: '2s' }} />
        </div>

        <h1 className="text-4xl font-black tracking-tight text-white mb-2"
          style={{ fontFamily: 'Montserrat, Inter, sans-serif' }}>
          {isSnackOnlySale ? '¡Venta Realizada!' : '¡Compra Exitosa!'}
        </h1>
        <p className="text-slate-400 max-w-sm text-sm leading-relaxed">
          {isSnackOnlySale
            ? 'La venta de productos ha sido procesada correctamente.'
            : 'Tu entrada ya está lista. Muestra el código QR al portero para acceder a la sala.'}
        </p>
      </div>

      {/* ── Ticket Card (Unificado para Cine y Dulcería) ── */}
      {/* ── Ticket de Cine (Si NO es snack-only) ── */}
      {!isSnackOnlySale && (qrBase64 || ticketData) && (
        <div className="w-full max-w-sm z-10 mb-8 animate-in fade-in zoom-in duration-500"
          style={{ filter: 'drop-shadow(0 20px 60px rgba(0,0,0,0.6))' }}>

          {/* Ticket físico */}
          <div className="rounded-3xl overflow-hidden relative printable-ticket"
            style={{ background: '#111827', border: '1px solid rgba(51,65,85,0.6)' }}>

            {/* Banda superior de color */}
            <div className="h-2 w-full no-print bg-gradient-to-r from-blue-500 to-indigo-500" />

            {/* Cabecera del ticket */}
            <div className="px-6 py-5 text-center border-b border-slate-800">

              {/* Cabecera de marca para Impresión */}
              <div className="print-only mb-4">
                <h1 className="text-2xl font-black tracking-wider text-black font-sans uppercase">CineStream</h1>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                  Boleto de Entrada
                </p>
                <div className="border-b border-dashed border-black mt-3 w-full" />
              </div>

              <div className="flex items-center justify-center gap-2 mb-1 no-print">
                <Ticket className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold tracking-widest uppercase text-blue-400">
                  Boleto Digital
                </span>
              </div>
              <h2 className="text-xl font-black text-white leading-tight mt-2"
                style={{ fontFamily: 'Montserrat, Inter, sans-serif' }}>
                {movieTitle}
              </h2>
            </div>

            {/* Detalles */}
            <div className="px-6 py-2">
              <DetailRow icon={MapPin} label="Sala" value={roomName} />
              <DetailRow icon={Calendar} label="Fecha y Hora" value={formattedDate} />
              {seatNumbers.length > 0 && (
                <DetailRow icon={Users} label="Asientos" value={seatNumbers.join(', ')} />
              )}
              {/* Ocultamos esta fila de total del print, ya que se renderiza al final de la impresión */}
              <DetailRow icon={DollarSign} label="Total Pagado" value={`Bs. ${totalPrice}`} accent className="no-print" />

              {/* Detalles para Impresión */}
              <div className="print-only mt-3 pt-3 border-t border-dashed border-black">
                <div className="flex justify-between text-black font-bold text-sm">
                  <span>TOTAL PAGADO:</span>
                  <span>Bs. {totalPrice}</span>
                </div>
              </div>
            </div>

            {/* Separador tipo perforación */}
            <div className="relative my-1 mx-0 border-slate-700">
              <div className="border-t border-dashed border-slate-700 mx-6" />
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-brand-dark no-print" />
              <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-brand-dark no-print" />
            </div>

            {/* QR Code */}
            <div className="px-6 py-5 flex flex-col items-center">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                Código de Acceso
              </p>
              {isGeneratingQR ? (
                <div className="w-44 h-44 rounded-2xl flex flex-col items-center justify-center bg-slate-800/50 border border-slate-700">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Generando QR...</span>
                </div>
              ) : qrBase64 ? (
                <div className="bg-white p-3 rounded-2xl shadow-inner"
                  style={{ boxShadow: '0 0 0 6px rgba(59,130,246,0.1), 0 8px 32px rgba(0,0,0,0.4)' }}>
                  <img src={qrBase64} alt="Código QR de acceso"
                    className="w-44 h-44 object-contain" />
                </div>
              ) : (
                <div className="w-44 h-44 rounded-2xl flex items-center justify-center bg-slate-800 border border-slate-700">
                  <span className="text-slate-500 text-sm text-center px-4">QR no disponible</span>
                </div>
              )}
              <p className="text-slate-500 text-xs text-center mt-3 max-w-[200px] leading-relaxed no-print">
                Muéstralo desde tu celular al portero antes de ingresar.
              </p>
              <p className="text-slate-700 text-[10px] mt-2 font-mono">
                #{transactionId.slice(-12).toUpperCase()}
              </p>

              {/* Pie de página para Impresión */}
              <div className="print-only w-full mt-4 pt-4 border-t border-dashed border-black text-center">
                <p className="text-xs font-bold text-black uppercase tracking-wider">¡Disfruta de la función! 🎬</p>
                <p className="text-[9px] text-slate-500 mt-1">CineStream · www.cinestream.com</p>
              </div>
            </div>

            {/* Banda inferior */}
            <div className="h-1.5 w-full no-print bg-gradient-to-r from-indigo-500 to-blue-500" />
          </div>
        </div>
      )}

      {/* ── Ticket de Dulcería (Si hay snacks) ── */}
      {snacks.length > 0 && (snacksQrBase64 || ticketData) && (
        <div className="w-full max-w-sm z-10 mb-8 animate-in fade-in zoom-in duration-500 animate-delay-150"
          style={{ filter: 'drop-shadow(0 20px 60px rgba(0,0,0,0.6))' }}>

          {/* Ticket físico */}
          <div className="rounded-3xl overflow-hidden relative printable-ticket"
            style={{ background: '#111827', border: '1px solid rgba(245,158,11,0.4)' }}>

            {/* Banda superior de color */}
            <div className="h-2 w-full no-print bg-gradient-to-r from-amber-500 to-yellow-500" />

            {/* Cabecera del ticket */}
            <div className="px-6 py-5 text-center border-b border-slate-800">

              {/* Cabecera de marca para Impresión */}
              <div className="print-only mb-4">
                <h1 className="text-2xl font-black tracking-wider text-black font-sans uppercase">CineStream</h1>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                  Comprobante de Dulcería
                </p>
                <div className="border-b border-dashed border-black mt-3 w-full" />
              </div>

              <div className="flex items-center justify-center gap-2 mb-1 no-print">
                <Cookie className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold tracking-widest uppercase text-amber-400">
                  CandyBar Express Pickup
                </span>
              </div>
              <h2 className="text-xl font-black text-white leading-tight mt-2"
                style={{ fontFamily: 'Montserrat, Inter, sans-serif' }}>
                Retiro de Dulcería
              </h2>

              {/* Badge de Estado en Tiempo Real */}
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Pendiente de Retiro
              </div>
            </div>

            {/* Detalles */}
            <div className="px-6 py-4">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                Productos Adquiridos
              </p>
              
              <div className="space-y-2">
                {snacks.map((snack, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 font-bold font-mono text-xs">{snack.quantity}x</span>
                      <span className="text-white font-medium">{snack.name}</span>
                    </div>
                    <span className="text-slate-400">Bs. {(snack.price * snack.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Detalles de dulcería para Impresión */}
              <div className="print-only mt-3 pt-3 border-t border-dashed border-black">
                <div className="flex justify-between text-black font-bold text-sm">
                  <span>TOTAL PAGADO:</span>
                  <span>Bs. {totalPrice}</span>
                </div>
              </div>
            </div>

            {/* Separador tipo perforación */}
            <div className="relative my-1 mx-0 border-slate-700">
              <div className="border-t border-dashed border-slate-700 mx-6" />
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-brand-dark no-print" />
              <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-brand-dark no-print" />
            </div>

            {/* QR Code */}
            <div className="px-6 py-5 flex flex-col items-center">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                Código de Retiro Express
              </p>
              {isGeneratingQR ? (
                <div className="w-44 h-44 rounded-2xl flex flex-col items-center justify-center bg-slate-800/50 border border-slate-700">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-2" />
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Generando QR...</span>
                </div>
              ) : snacksQrBase64 ? (
                <div className="bg-white p-3 rounded-2xl shadow-inner"
                  style={{ boxShadow: '0 0 0 6px rgba(245,158,11,0.1), 0 8px 32px rgba(0,0,0,0.4)' }}>
                  <img src={snacksQrBase64} alt="Código QR de snacks"
                    className="w-44 h-44 object-contain" />
                </div>
              ) : (
                <div className="w-44 h-44 rounded-2xl flex items-center justify-center bg-slate-800 border border-slate-700">
                  <span className="text-slate-500 text-sm text-center px-4">QR no disponible</span>
                </div>
              )}
              <p className="text-slate-500 text-xs text-center mt-3 max-w-[200px] leading-relaxed no-print">
                Presenta este QR directamente en el CandyBar para un retiro express.
              </p>
              <p className="text-slate-700 text-[10px] mt-2 font-mono">
                #{transactionId.slice(-12).toUpperCase()}
              </p>

              {/* Pie de página para Impresión */}
              <div className="print-only w-full mt-4 pt-4 border-t border-dashed border-black text-center">
                <p className="text-xs font-bold text-black uppercase tracking-wider">¡Disfruta tus snacks! 🍿</p>
                <p className="text-[9px] text-slate-500 mt-1">CineStream · www.cinestream.com</p>
              </div>
            </div>

            {/* Banda inferior */}
            <div className="h-1.5 w-full no-print bg-gradient-to-r from-yellow-500 to-amber-500" />
          </div>
        </div>
      )}

      {/* ── Resumen de Dulcería (Si hay snacks) ── */}
      {snacks.length > 0 && (
        <div className="w-full max-w-sm bg-slate-900/50 border border-slate-800 rounded-3xl p-6 mb-8 z-10 animate-in fade-in slide-in-from-bottom-4 shadow-2xl no-print">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Productos Adquiridos
          </h3>
          <div className="space-y-3">
            {snacks.map((snack, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-mono text-xs">{snack.quantity}x</span>
                  <span className="text-white font-medium">{snack.name}</span>
                </div>
                <span className="text-emerald-400 font-bold">Bs. {(snack.price * snack.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="pt-3 mt-1 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Final</span>
              <span className="text-lg font-black text-white">Bs. {totalPrice}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Botones de acción ── */}
      <div className="flex flex-col gap-3 w-full max-w-sm z-10 no-print">
        {/* Acciones de taquilla rápidas (solo para staff / admin) */}
        {(user?.role === 'staff' || user?.role === 'admin') && (
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={() => window.print()}
              className="flex-1 flex items-center justify-center gap-2 font-bold py-4 px-5 rounded-2xl transition-all border border-slate-700 hover:border-slate-500"
              style={{ background: '#1E2A3B', color: '#fff' }}
            >
              <Printer className="w-5 h-5 text-emerald-400" />
              Imprimir Ticket
            </button>
            <button
              onClick={() => setShowDigitalSend(!showDigitalSend)}
              className={`flex-1 flex items-center justify-center gap-2 font-bold py-4 px-5 rounded-2xl transition-all border ${showDigitalSend ? 'border-blue-500 bg-blue-950/20' : 'border-slate-700 hover:border-slate-500'}`}
              style={{ background: showDigitalSend ? 'rgba(59,130,246,0.1)' : '#1E2A3B', color: '#fff' }}
            >
              📱 Enviar a Celular
            </button>
          </div>
        )}

        {/* Sección desplegable para Envío Digital */}
        {showDigitalSend && (
          <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-250 flex flex-col gap-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Enviar Boleto Digital (WhatsApp o Correo)
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={digitalContact}
                onChange={e => setDigitalContact(e.target.value)}
                placeholder="WhatsApp (+591...) o Correo"
                className="input-field py-2 text-sm"
              />
              <button
                onClick={handleSendDigital}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Enviar
              </button>
            </div>
          </div>
        )}

        {/* Botones estándar de descarga/navegación */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF || isGeneratingQR || (!isSnackOnlySale && (!qrBase64 || !startTime))}
            className="flex-1 flex items-center justify-center gap-2 font-bold py-4 px-5 rounded-2xl transition-all border border-slate-700 hover:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: '#1E2A3B', color: '#fff' }}
            title={(!isSnackOnlySale && (!qrBase64 || !startTime)) ? "Espere a que se generen todos los datos" : "Descargar comprobante"}
          >
            {isGeneratingPDF ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 text-blue-400" />
                Descargar PDF
              </>
            )}
          </button>

          {(user?.role === 'staff' || user?.role === 'admin') ? (
            <button
              onClick={() => navigate('/pos')}
              className="flex-1 flex items-center justify-center gap-2 font-bold py-4 px-5 rounded-2xl transition-all"
              style={{ background: '#10B981', color: '#fff', boxShadow: '0 4px 20px rgba(16,185,129,0.35)' }}
              onMouseEnter={e => e.currentTarget.style.background = '#059669'}
              onMouseLeave={e => e.currentTarget.style.background = '#10B981'}
            >
              Siguiente Venta
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/my-tickets')}
                className="flex-1 flex items-center justify-center gap-2 font-bold py-4 px-5 rounded-2xl transition-all border border-slate-700 hover:border-slate-500"
                style={{ background: '#1E2A3B', color: '#fff' }}
              >
                <Ticket className="w-5 h-5 text-purple-400" />
                Mis Tickets
              </button>

              <button
                onClick={() => navigate('/movies')}
                className="flex-1 flex items-center justify-center gap-2 font-bold py-4 px-5 rounded-2xl transition-all"
                style={{ background: '#3B82F6', color: '#fff', boxShadow: '0 4px 20px rgba(59,130,246,0.35)' }}
                onMouseEnter={e => e.currentTarget.style.background = '#2563EB'}
                onMouseLeave={e => e.currentTarget.style.background = '#3B82F6'}
              >
                <Home className="w-5 h-5" />
                Cartelera
              </button>
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
