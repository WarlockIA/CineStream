import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAPIUrl, getImageUrl, SOCKET_URL } from '../config/api';
import { Html5Qrcode } from 'html5-qrcode';

import jsQR from 'jsqr';
import { toastSuccess, toastError } from '../utils/toastHelper';
import { LogOut, Scan, UserCheck, AlertOctagon, Image as ImageIcon, Check, Cookie, Film, ChevronDown } from 'lucide-react';
import { toBoliviaInputString } from '../utils/dateHelper';


export default function PorteroPanel() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [scanAttempt, setScanAttempt] = useState('');
  const isValidatingRef = React.useRef(false);
  const isMountedRef = React.useRef(true);
  const scannerRef = React.useRef(null);
  const fileInputRef = React.useRef(null);

  // Estados de PWA y Aforo
  const [functionsList, setFunctionsList] = useState([]);
  const [selectedFunctionId, setSelectedFunctionId] = useState('');
  const [isFunctionDropdownOpen, setIsFunctionDropdownOpen] = useState(false);
  const [validations, setValidations] = useState(null);
  const [pulseType, setPulseType] = useState(null); // 'success', 'error', or null

  // Nuevos estados para Modo Dulcería Express
  const [validationMode, setValidationMode] = useState('entry'); // 'entry' | 'snacks'
  const [checkedItems, setCheckedItems] = useState({});

  const validationModeRef = React.useRef(validationMode);
  useEffect(() => {
    validationModeRef.current = validationMode;
  }, [validationMode]);

  // Dynamic HUD config based on validation state/result and validation mode
  const hudColors = React.useMemo(() => {
    if (pulseType === 'success') {
      return {
        border: 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]',
        text: 'text-emerald-400 font-extrabold',
        crosshair: 'border-emerald-400',
        centerDot: 'bg-emerald-500 shadow-[0_0_12px_#10b981]',
        laser: 'from-transparent via-emerald-500 to-transparent',
        laserShadow: '0 0 15px rgba(16, 185, 129, 0.9)',
        gridColor: 'rgba(16, 185, 129, 0.15)',
        statusText: '★ ACCESO CONCEDIDO ★',
        borderColor: 'border-emerald-500/50',
      };
    } else if (pulseType === 'error') {
      return {
        border: 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]',
        text: 'text-red-500 font-extrabold',
        crosshair: 'border-red-400',
        centerDot: 'bg-red-500 shadow-[0_0_12px_#ef4444]',
        laser: 'from-transparent via-red-500 to-transparent',
        laserShadow: '0 0 15px rgba(239, 68, 68, 0.9)',
        gridColor: 'rgba(239, 68, 68, 0.15)',
        statusText: '⚠ ACCESO DENEGADO ⚠',
        borderColor: 'border-red-500/50',
      };
    } else if (isValidating) {
      return {
        border: 'border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]',
        text: 'text-amber-400 font-extrabold animate-pulse',
        crosshair: 'border-amber-400',
        centerDot: 'bg-amber-500 shadow-[0_0_10px_#f59e0b]',
        laser: 'from-transparent via-amber-500 to-transparent',
        laserShadow: '0 0 12px rgba(245, 158, 11, 0.8)',
        gridColor: 'rgba(245, 158, 11, 0.1)',
        statusText: '⚡ PROCESANDO QR...',
        borderColor: 'border-amber-500/30',
      };
    } else {
      const isSnacks = validationMode === 'snacks';
      return {
        border: isSnacks ? 'border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]',
        text: isSnacks ? 'text-amber-400 font-bold' : 'text-blue-400 font-bold',
        crosshair: isSnacks ? 'border-amber-400' : 'border-blue-400',
        centerDot: isSnacks ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 'bg-blue-500 shadow-[0_0_8px_#3b82f6]',
        laser: isSnacks ? 'from-transparent via-amber-500 to-transparent' : 'from-transparent via-blue-500 to-transparent',
        laserShadow: isSnacks ? '0 0 10px rgba(245, 158, 11, 0.8)' : '0 0 10px rgba(59, 130, 246, 0.8)',
        gridColor: isSnacks ? 'rgba(245, 158, 11, 0.07)' : 'rgba(59, 130, 246, 0.07)',
        statusText: isSnacks ? '■ CANDYBAR LISTO - ESCANEANDO' : '■ CÁMARA LISTA - ESCANEANDO',
        borderColor: 'border-slate-800',
      };
    }
  }, [pulseType, isValidating, validationMode]);


  // Helpers de Audio (Web Audio API) y Háptico
  const playSuccessSound = (mode = validationMode) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (mode === 'snacks') {
        // Sonido de burbujeo / confitería alegre (Dos notas rápidas ascendentes con trino)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // 880Hz
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2); // 200ms fade
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (e) {
      console.error('Audio success error:', e);
    }
  };

  const playErrorSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime); // 150Hz

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35); // 350ms fade

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.error('Audio error error:', e);
    }
  };

  const triggerHapticSuccess = () => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(200);
      } catch (e) {}
    }
  };

  const triggerHapticError = () => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch (e) {}
    }
  };

  // Carga de funciones del día
  const fetchTodayFunctions = async () => {
    try {
      const todayStr = toBoliviaInputString(new Date()).split('T')[0];
      const res = await axios.get(getAPIUrl(`/api/functions?date=${todayStr}&includeInactive=true`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = res.data.data || [];
      setFunctionsList(list);
      if (list.length > 0 && !selectedFunctionId) {
        setSelectedFunctionId(list[0].id);
      }
    } catch (err) {
      console.error("Error cargando funciones del día:", err);
    }
  };

  const fetchValidations = useCallback(async (funcId) => {
    if (!funcId) return;
    try {
      const res = await axios.get(getAPIUrl(`/api/functions/${funcId}/validations`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setValidations(res.data.data);
    } catch (err) {
      console.error("Error al cargar estadísticas de aforo:", err);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchTodayFunctions();
    }
  }, [token]);

  useEffect(() => {
    if (selectedFunctionId) {
      fetchValidations(selectedFunctionId);
    } else {
      setValidations(null);
    }
  }, [selectedFunctionId, fetchValidations]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const processQrToken = async (decodedText) => {
    if (!isMountedRef.current) return;

    // Pausar la cámara de forma nativa para no saturar procesos
    try {
      if (scannerRef.current && scannerRef.current.getState() === 2) { // 2 = SCANNING
        scannerRef.current.pause(true);
      }
    } catch (e) { }

    const currentMode = validationModeRef.current;

    try {
      const endpoint = currentMode === 'snacks' ? 'scan-snacks-qr' : 'scan-qr';
      const res = await axios.post(
        getAPIUrl(`/api/bookings/${endpoint}`),
        { token: decodedText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (isMountedRef.current) {
        const data = res.data.data;
        toastSuccess(currentMode === 'snacks' ? 'Dulcería validada correctamente.' : 'Ticket válido. Acceso concedido.');
        triggerHapticSuccess();
        playSuccessSound(currentMode);
        setPulseType('success');

        // Delay updating screen states so the HUD has time to pulse green
        setTimeout(() => {
          if (isMountedRef.current) {
            setIsScanning(false);
            if (currentMode === 'snacks') {
              setScanResult({
                success: true,
                title: "Entrega Autorizada",
                isSnacksDelivery: true,
                snacks: data.snacks || [],
                transactionId: data.transactionId
              });
            } else {
              setScanResult({
                success: true,
                title: "Acceso Permitido",
                movie: data.movieTitle,
                room: data.roomName,
                seats: data.seatNumbers.join(', ')
              });
            }
            setPulseType(null);
          }
        }, 1000);

        // Actualizar estadísticas de aforo: usar el functionId del ticket escaneado
        // para auto-seleccionar la función correcta en el dropdown y refrescar el aforo
        if (currentMode === 'entry') {
          const scannedFunctionId = data.functionId;
          if (scannedFunctionId) {
            // Si la función escaneada no está en la lista actual (ej. día anterior), inyectarla
            setFunctionsList(prev => {
              const exists = prev.find(f => f.id === scannedFunctionId);
              if (!exists) {
                return [...prev, {
                  id: scannedFunctionId,
                  startTime: data.startTime || new Date().toISOString(),
                  Movie: { title: data.movieTitle || 'Función Escaneada' },
                  Room: { name: data.roomName || 'Sala Desconocida' }
                }];
              }
              return prev;
            });
            // Auto-cambiar la función seleccionada para que coincida con el ticket escaneado
            setSelectedFunctionId(scannedFunctionId);
            fetchValidations(scannedFunctionId);
          } else if (selectedFunctionId) {
            // Fallback: refrescar la función actualmente seleccionada
            fetchValidations(selectedFunctionId);
          }
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        toastError(err.response?.data?.message || 'Error al validar el código QR.');
        triggerHapticError();
        playErrorSound();
        setPulseType('error');

        // Delay updating screen states so the HUD has time to pulse red
        setTimeout(() => {
          if (isMountedRef.current) {
            setIsScanning(false);
            setScanResult({
              success: false,
              title: currentMode === 'snacks' ? "Entrega Rechazada" : "Acceso Denegado",
              message: err.response?.data?.message || 'Error al validar el código QR.'
            });
            setPulseType(null);
          }
        }, 1000);
      }
    } finally {
      if (isMountedRef.current) {
        setIsValidating(false);
        isValidatingRef.current = false;
      }
    }
  };

  useEffect(() => {
    if (!isScanning) return;

    const html5QrCode = new Html5Qrcode("qr-reader");
    scannerRef.current = html5QrCode;

    const onScanSuccess = async (decodedText) => {
      // Semáforo para evitar llamadas duplicadas
      if (!isMountedRef.current || isValidatingRef.current) return;
      isValidatingRef.current = true;
      setIsValidating(true);
      await processQrToken(decodedText);
    };

    const onScanFailure = (error) => {
      // Silenciar completamente los errores asíncronos del escaneo continuo
    };

    // Arrancar la cámara y guardar la promesa
    const startPromise = html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      onScanSuccess,
      onScanFailure
    );

    startPromise.catch(err => {
      console.error("Error iniciando cámara", err);
    });

    // Cleanup de React al desmontar (Strict Mode safe)
    return () => {
      // Esperamos a que termine de prender para recién apagarla
      startPromise.then(() => {
        try {
          html5QrCode.stop().catch(() => { });
        } catch (e) { }
      }).catch(() => {
        // Falló al iniciar, no hay que apagar nada
      });
    };
  }, [isScanning, token]);

  // ──────────────────────────────────────────────────────────────
  // Motor de Decodificación Multi-Motor (Alta Densidad)
  // Motor 1: BarcodeDetector API (nativa Chrome/Edge, hardware-acelerada)
  // Motor 2: jsQR (puro JS, excelente con QR densos)
  // Motor 3: html5-qrcode / ZXing (fallback)
  // ──────────────────────────────────────────────────────────────

  /** Carga un File o URL como HTMLImageElement */
  const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = typeof src === 'string' ? src : URL.createObjectURL(src);
  });

  /** Dibuja una imagen en un canvas con escala, filtros CSS opcionales y margen/quiet zone */
  const imageToCanvas = async (img, scale = 1, filter = '', addQuietZone = false) => {
    const canvas = document.createElement('canvas');
    const originalWidth = img.naturalWidth * scale;
    const originalHeight = img.naturalHeight * scale;

    if (addQuietZone) {
      // Agregar un margen blanco de 40px en cada lado (Quiet Zone)
      const padding = 40;
      canvas.width = originalWidth + (padding * 2);
      canvas.height = originalHeight + (padding * 2);
      
      const ctx = canvas.getContext('2d');
      
      // Rellenar fondo con blanco (Quiet Zone)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Aplicar filtros de imagen si existen
      if (filter) ctx.filter = filter;
      
      // Dibujar la imagen centrada
      ctx.drawImage(img, padding, padding, originalWidth, originalHeight);
    } else {
      canvas.width = originalWidth;
      canvas.height = originalHeight;
      const ctx = canvas.getContext('2d');
      if (filter) ctx.filter = filter;
      ctx.drawImage(img, 0, 0, originalWidth, originalHeight);
    }
    return canvas;
  };

  /** Motor 1: Chrome/Edge BarcodeDetector API (hardware-acelerado, soporta QR densos) */
  const decodeWithBarcodeDetector = async (imageBitmap) => {
    if (!('BarcodeDetector' in window)) throw new Error('BarcodeDetector no disponible');
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    const barcodes = await detector.detect(imageBitmap);
    if (!barcodes.length) throw new Error('No QR detectado por BarcodeDetector');
    return barcodes[0].rawValue;
  };

  /** Motor 2: jsQR — excelente con datos de alta densidad */
  const decodeWithJsQR = (canvas) => {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(imageData.data, canvas.width, canvas.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (!result) throw new Error('jsQR no encontró QR');
    return result.data;
  };

  /** Motor 3: html5-qrcode / ZXing (fallback) */
  const decodeWithZXing = async (file) => {
    const scanner = new Html5Qrcode('qr-file-reader');
    try {
      return await scanner.scanFile(file, true);
    } finally {
      try { await scanner.clear(); } catch (_) { }
    }
  };

  /** Convierte un canvas a File PNG */
  const canvasToFile = (canvas, name) => new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(new File([blob], name, { type: 'image/png' })), 'image/png');
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (isValidatingRef.current) return;

    isValidatingRef.current = true;
    setIsValidating(true);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const img = await loadImage(file);

      // --- Motor 1: BarcodeDetector (Chrome/Edge nativo) ---
      setScanAttempt('Analizando con motor nativo...');
      try {
        const bitmap = await createImageBitmap(file);
        const decoded = await decodeWithBarcodeDetector(bitmap);
        setScanAttempt('¡Código detectado! Validando...');
        return await processQrToken(decoded);
      } catch (_) { }

      // --- Motor 2a: jsQR en imagen original ---
      setScanAttempt('Intento 2: Leyendo con jsQR...');
      try {
        const canvas = await imageToCanvas(img, 1);
        const decoded = decodeWithJsQR(canvas);
        setScanAttempt('¡Código detectado! Validando...');
        return await processQrToken(decoded);
      } catch (_) { }

      // --- Motor 2b: jsQR con margen blanco (Quiet Zone) ---
      setScanAttempt('Intento 3: Ajustando margen (Quiet Zone)...');
      try {
        const canvas = await imageToCanvas(img, 1, '', true);
        const decoded = decodeWithJsQR(canvas);
        setScanAttempt('¡Código detectado! Validando...');
        return await processQrToken(decoded);
      } catch (_) { }

      // --- Motor 2c: jsQR con escala 2x, margen y escala de grises ---
      setScanAttempt('Intento 4: Maximizando contraste y grises...');
      try {
        const canvas = await imageToCanvas(img, 2, 'grayscale(1) contrast(200%) brightness(100%)', true);
        const decoded = decodeWithJsQR(canvas);
        setScanAttempt('¡Código detectado! Validando...');
        return await processQrToken(decoded);
      } catch (_) { }

      // --- Motor 3: ZXing / html5-qrcode con escala, margen y contraste ---
      setScanAttempt('Intento 5: Motor alternativo...');
      const scaledCanvas = await imageToCanvas(img, 2, 'grayscale(1) contrast(180%) brightness(100%)', true);
      const scaledFile = await canvasToFile(scaledCanvas, file.name);
      const decoded = await decodeWithZXing(scaledFile);
      setScanAttempt('¡Código detectado! Validando...');
      await processQrToken(decoded);

    } catch (err) {
      toastError('No se pudo leer el código QR. Asegúrate de que la imagen sea nítida y el QR esté completo.');
      setIsValidating(false);
      isValidatingRef.current = false;
      setPreviewUrl(null);
      setScanAttempt('');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const resetScanner = () => {
    setScanResult(null);
    setCheckedItems({});
    setIsValidating(false);
    isValidatingRef.current = false;
    setIsScanning(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 sm:p-6 md:p-8 relative">
      {/* Dynamic Validation Pulse Overlay */}
      <div 
        className={`fixed inset-0 pointer-events-none z-50 transition-opacity duration-700 ease-out ${
          pulseType ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: pulseType === 'success' 
            ? 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)'
            : pulseType === 'error'
              ? 'radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, transparent 70%)'
              : 'transparent'
        }}
      />
      {/* Header Portero */}
      <div className="w-full max-w-5xl nav-premium flex justify-between items-center p-4 md:p-6 mb-6 rounded-2xl">
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
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block mt-0.5">🔍 Portero / Usher</span>
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-4">
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
                {user?.fullname || 'Portero'}
              </span>
              <span className="vip-profile-badge">
                <span className="vip-profile-crown">🔍</span> Portero
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          <button 
            onClick={handleLogout} 
            className="logout-btn-hud flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Columna Izquierda: Selector de función y Control de Aforo (5 cols) */}
        <div className="md:col-span-5 flex flex-col gap-6 w-full">
          
          {/* Card: Selector de Función */}
          <div className="relative z-50 w-full bg-slate-900/60 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-white text-base font-bold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              Selección de Función
            </h2>
            <div className="relative">
              {/* Premium Custom Dropdown */}
              <div 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm font-medium transition-colors cursor-pointer flex justify-between items-center hover:border-blue-500/50"
                onClick={() => setIsFunctionDropdownOpen(!isFunctionDropdownOpen)}
              >
                <span className="truncate pr-4">
                  {functionsList.length === 0 ? (
                    'No hay funciones programadas hoy'
                  ) : (
                    (() => {
                      const selFunc = functionsList.find(f => f.id === selectedFunctionId) || functionsList[0];
                      if (!selFunc) return 'Seleccionar función...';
                      const timeStr = new Date(selFunc.startTime).toLocaleTimeString('es-BO', {
                        hour: '2-digit', minute: '2-digit', hour12: false
                      });
                      return (
                        <div className="flex items-center gap-3">
                          {selFunc.Movie?.posterUrl ? (
                            <img src={getImageUrl(selFunc.Movie.posterUrl)} alt="poster" className="w-8 h-10 object-cover rounded shadow-sm border border-slate-700/50" />
                          ) : (
                            <div className="w-8 h-10 bg-slate-800 rounded flex items-center justify-center border border-slate-700/50"><Film className="w-4 h-4 text-slate-500" /></div>
                          )}
                          <div className="flex flex-col text-left">
                            <span className="font-bold text-slate-100 leading-tight truncate">{selFunc.Movie?.title || 'Sin Título'}</span>
                            <span className="text-xs text-slate-400 mt-0.5">{selFunc.Room?.name || 'Sin Sala'} • {timeStr}</span>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isFunctionDropdownOpen ? 'rotate-180 text-blue-400' : ''}`} />
              </div>
              
              {/* Dropdown Menu */}
              {isFunctionDropdownOpen && functionsList.length > 0 && (
                <div className="absolute z-50 top-full mt-2 w-full bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-hidden">
                  {functionsList.map((f) => {
                    const isSelected = f.id === selectedFunctionId;
                    const timeStr = new Date(f.startTime).toLocaleTimeString('es-BO', {
                      hour: '2-digit', minute: '2-digit', hour12: false
                    });
                    return (
                      <div
                        key={f.id}
                        className={`px-4 py-3 cursor-pointer transition-colors border-b border-slate-800/50 last:border-0 flex items-center gap-3 ${
                          isSelected ? 'bg-blue-600/10 border-l-2 border-l-blue-500' : 'hover:bg-slate-800 border-l-2 border-l-transparent'
                        }`}
                        onClick={() => {
                          setSelectedFunctionId(f.id);
                          setIsFunctionDropdownOpen(false);
                        }}
                      >
                        {f.Movie?.posterUrl ? (
                          <img src={getImageUrl(f.Movie.posterUrl)} alt="poster" className="w-8 h-10 object-cover rounded shadow-sm border border-slate-700/50" />
                        ) : (
                          <div className="w-8 h-10 bg-slate-800 rounded flex items-center justify-center border border-slate-700/50"><Film className="w-4 h-4 text-slate-500" /></div>
                        )}
                        <div className="flex flex-col text-left">
                          <span className={`text-sm font-bold leading-tight ${isSelected ? 'text-blue-400' : 'text-slate-200'}`}>{f.Movie?.title || 'Sin Título'}</span>
                          <span className={`text-xs mt-0.5 ${isSelected ? 'text-blue-500/80' : 'text-slate-500'}`}>{f.Room?.name || 'Sin Sala'} • {timeStr}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Card: Control de Aforo (Anillo SVG) */}
          <div className="w-full bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm flex flex-col items-center">
            <h2 className="text-white text-base font-bold mb-6 self-start flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              Estado de Aforo
            </h2>
            
            {validations ? (
              <div className="w-full flex flex-col items-center">
                {/* Anillo SVG Reactivo */}
                {(() => {
                  const capacity = validations.capacity || 1;
                  const validatedCount = validations.validatedCount || 0;
                  const percentage = (validatedCount / capacity) * 100;
                  const percentClamp = Math.min(100, Math.round(percentage));
                  
                  // Circunferencia de r=45 es 2 * pi * 45 = 282.74
                  const circumference = 282.74;
                  const strokeDashoffset = circumference - (percentClamp / 100) * circumference;
                  
                  // Determinar color reactivo
                  let ringColor = 'text-emerald-500';
                  let ringBg = 'bg-emerald-500/10';
                  let statusText = 'Aforo Normal';
                  let pulseClass = '';
                  
                  if (percentClamp >= 100) {
                    ringColor = 'text-red-500';
                    ringBg = 'bg-red-500/10';
                    statusText = 'Sala Llena';
                    pulseClass = 'animate-pulse';
                  } else if (percentClamp >= 85) {
                    ringColor = 'text-amber-500';
                    ringBg = 'bg-amber-500/10';
                    statusText = 'Aforo Crítico';
                  }

                  return (
                    <div className="flex flex-col items-center w-full">
                      {/* SVG Wrapper */}
                      <div className="relative w-36 h-36 mb-6">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          {/* Fondo */}
                          <circle
                            className="text-slate-800"
                            strokeWidth="8"
                            stroke="currentColor"
                            fill="transparent"
                            r="45"
                            cx="50"
                            cy="50"
                          />
                          {/* Progreso */}
                          <circle
                            className={`transition-all duration-700 ease-out ${ringColor} ${pulseClass}`}
                            strokeWidth="8"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r="45"
                            cx="50"
                            cy="50"
                          />
                        </svg>
                        {/* Text Overlay */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-black text-white tracking-tight">{percentClamp}%</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${ringBg} ${ringColor} uppercase tracking-wider`}>
                            {statusText}
                          </span>
                        </div>
                      </div>

                      {/* Movie and Details */}
                      <div className="text-center mb-6 px-2">
                        <h3 className="text-white font-extrabold text-base line-clamp-1">{validations.movieTitle}</h3>
                        <p className="text-slate-400 text-xs mt-0.5">Sala: <span className="font-semibold text-slate-300">{validations.roomName}</span></p>
                      </div>

                      {/* Stat Tiles */}
                      <div className="grid grid-cols-3 gap-3 w-full border-t border-slate-800/80 pt-5">
                        <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-2xl flex flex-col items-center">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider text-center">Validados</span>
                          <span className="text-base font-black text-emerald-400 mt-1">{validations.validatedCount}</span>
                        </div>
                        <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-2xl flex flex-col items-center">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider text-center">Vendidos</span>
                          <span className="text-base font-black text-blue-400 mt-1">{validations.totalSeatsSold}</span>
                        </div>
                        <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-2xl flex flex-col items-center">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider text-center">Aforo Max</span>
                          <span className="text-base font-black text-slate-400 mt-1">{validations.capacity}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-sm">
                <div className="w-8 h-8 rounded-full border-2 border-slate-750 border-t-blue-500 animate-spin mb-3" />
                <span>Cargando datos de aforo...</span>
              </div>
            )}
          </div>

        </div>

        {/* Columna Derecha: Lector QR / Detalle del Boleto (7 cols) */}
        <div className="md:col-span-7 w-full font-sans">
          
          {isScanning ? (
            <div className="w-full bg-slate-900/60 border border-slate-800 p-6 md:p-8 rounded-3xl shadow-xl backdrop-blur-sm flex flex-col items-center">
              <h2 className="text-white text-base font-bold mb-2 flex items-center gap-2">
                <Scan className="w-5 h-5 text-blue-400 animate-pulse" />
                Escaneo en Tiempo Real
              </h2>
              <p className="text-slate-400 text-xs md:text-sm text-center mb-6">Apunta la cámara del dispositivo móvil al código QR del cliente</p>

              {/* Selector de Modo de Validación */}
              <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 w-full max-w-sm mb-6 shadow-inner">
                <button
                  onClick={() => setValidationMode('entry')}
                  className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 ${
                    validationMode === 'entry'
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.25)]'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  🎟️ Sala
                </button>
                <button
                  onClick={() => setValidationMode('snacks')}
                  className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 ${
                    validationMode === 'snacks'
                      ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  🍿 Dulcería
                </button>
              </div>

              {/* Contenedor del Lector QR */}
              <div className={`relative w-full max-w-sm aspect-square bg-slate-950 rounded-2xl overflow-hidden border-2 transition-all duration-300 shadow-2xl flex items-center justify-center ${hudColors.borderColor}`}>
                
                {/* Holographic Grid Overlay */}
                <div 
                  className="absolute inset-0 scifi-grid pointer-events-none z-10 transition-all duration-500" 
                  style={{ '--grid-color': hudColors.gridColor }} 
                />

                {/* Lector HTML5QRCODE */}
                <div id="qr-reader" className="w-full h-full object-cover"></div>

                {/* HUD Corner Brackets */}
                <div className={`absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 rounded-tl-md pointer-events-none z-10 transition-all duration-300 ${hudColors.border}`} />
                <div className={`absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 rounded-tr-md pointer-events-none z-10 transition-all duration-300 ${hudColors.border}`} />
                <div className={`absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 rounded-bl-md pointer-events-none z-10 transition-all duration-300 ${hudColors.border}`} />
                <div className={`absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 rounded-br-md pointer-events-none z-10 transition-all duration-300 ${hudColors.border}`} />

                {/* HUD Central Crosshair */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-40">
                  <div className={`w-20 h-20 border border-dashed rounded-full flex items-center justify-center animate-[spin_12s_linear_infinite] transition-colors duration-300 ${hudColors.crosshair}`} />
                  <div className={`absolute w-2.5 h-2.5 rounded-full transition-all duration-300 ${hudColors.centerDot}`} />
                </div>

                {/* Línea de escaneo láser estética */}
                <div 
                  className={`absolute inset-x-0 h-[2px] bg-gradient-to-r animate-[scan-line_2.5s_ease-in-out_infinite] pointer-events-none transition-all duration-300 ${hudColors.laser}`} 
                  style={{ boxShadow: hudColors.laserShadow }} 
                />

                {/* Sci-Fi Diagnostic and Meta Overlay */}
                <div className="absolute top-4 left-10 right-10 flex justify-between pointer-events-none z-10 text-[9px] font-mono tracking-widest text-slate-500/80">
                  <span>SYS_USHER_v2.6</span>
                  <span>FPS: 10HZ</span>
                </div>
                <div className="absolute bottom-4 left-10 right-10 flex justify-between pointer-events-none z-10 text-[9px] font-mono tracking-widest text-slate-500/80">
                  <span>DOOR: HALL_A</span>
                  <span>LOCK: OK</span>
                </div>

                {/* Central Status Overlay Banner */}
                <div className="absolute bottom-10 inset-x-0 flex justify-center pointer-events-none z-10">
                  <span className={`px-2 py-0.5 rounded bg-slate-950/80 border border-white/5 text-[9px] font-mono tracking-wider transition-colors duration-300 ${hudColors.text}`}>
                    {hudColors.statusText}
                  </span>
                </div>
                
                {/* Overlay de Carga sobre la cámara */}
                {isValidating && !previewUrl && (
                  <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex flex-col items-center justify-center z-20 animate-fade-in">
                    <div className="relative flex items-center justify-center mb-3">
                      <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                      <Scan className="w-5 h-5 text-amber-400 absolute animate-pulse" />
                    </div>
                    <p className="text-white font-extrabold text-xs tracking-wide">VERIFICANDO CODIGO...</p>
                    <p className="text-amber-500 text-[8px] font-mono uppercase tracking-widest mt-1">SSL / DECRYPTING</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-4 text-slate-500 text-[11px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Cámara activa detectando códigos</span>
              </div>

              {/* Opciones Avanzadas: Subida de Imagen */}
              <div className="w-full max-w-sm mt-6 pt-6 border-t border-slate-850 flex flex-col items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {/* Vista previa + Scanner Animado */}
                {previewUrl && isValidating && (
                  <div className={`relative w-full rounded-2xl overflow-hidden border transition-all duration-300 bg-slate-950 p-1 ${hudColors.borderColor}`}>
                    <img src={previewUrl} alt="preview" className="w-full object-contain max-h-48 rounded-xl opacity-30" />
                    
                    {/* Holographic Grid Overlay */}
                    <div 
                      className="absolute inset-0 scifi-grid pointer-events-none transition-all duration-500" 
                      style={{ '--grid-color': hudColors.gridColor }} 
                    />

                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
                      <div className="relative flex items-center justify-center">
                        <div className="w-8 h-8 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                        <Scan className="w-3.5 h-3.5 text-amber-400 absolute animate-pulse" />
                      </div>
                      <p className="text-amber-400 text-2xs font-mono font-extrabold text-center px-3 tracking-wide bg-slate-950/90 py-0.5 rounded-md border border-white/5">{scanAttempt}</p>
                    </div>
                    <div className={`absolute left-1 right-1 h-[2px] bg-gradient-to-r animate-[scan-line_2s_ease-in-out_infinite] ${hudColors.laser}`} style={{ boxShadow: hudColors.laserShadow }} />
                  </div>
                )}

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isValidating}
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 disabled:opacity-50"
                >
                  {isValidating && previewUrl ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                      Procesando archivo...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4 text-slate-400" />
                      Subir código QR (Boleto digital)
                    </>
                  )}
                </button>
                <p className="text-slate-500 text-[10px] text-center font-medium leading-normal">
                  ¿La cámara tiene problemas? Sube una foto nítida o captura de pantalla del código QR para validación alternativa.
                </p>
              </div>

              {/* Contenedor invisible dedicado solo a lectura de archivos */}
              <div id="qr-file-reader" style={{ display: 'none' }}></div>
            </div>
          ) : scanResult ? (
            <div className={`w-full p-6 md:p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center transition-all duration-300 ${
              scanResult.success
                ? 'bg-emerald-950/20 border-2 border-emerald-500/30 shadow-emerald-900/10'
                : 'bg-red-950/20 border-2 border-red-500/30 shadow-red-900/10'
            }`}>
              
              <div className="mb-6 relative flex items-center justify-center">
                {scanResult.success ? (
                  <>
                    <div className="absolute w-24 h-24 bg-emerald-500/10 rounded-full animate-ping duration-1000" />
                    <div className="bg-emerald-500/20 p-5 rounded-full border border-emerald-500/30 relative">
                      <UserCheck className="w-16 h-16 text-emerald-400" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="absolute w-24 h-24 bg-red-500/10 rounded-full animate-ping duration-1000" />
                    <div className="bg-red-500/20 p-5 rounded-full border border-red-500/30 relative">
                      <AlertOctagon className="w-16 h-16 text-red-400" />
                    </div>
                  </>
                )}
              </div>

              <h2 className={`text-2xl md:text-3xl font-black tracking-tight mb-2 ${scanResult.success ? 'text-emerald-400' : 'text-red-500'}`}>
                {scanResult.title}
              </h2>
              <p className="text-slate-400 text-xs md:text-sm max-w-sm mb-6">
                {scanResult.success ? (scanResult.isSnacksDelivery ? 'Entrega de confitería autorizada. Verifica el despacho a continuación.' : 'Acceso concedido para el ingreso a la sala de cine.') : (scanResult.title === "Entrega Rechazada" ? 'El código escaneado no es válido para retirar snacks o ya fue utilizado.' : 'El boleto escaneado no es válido para esta función o ya fue utilizado.')}
              </p>

              {scanResult.success ? (
                scanResult.isSnacksDelivery ? (
                  /* Módulo Checklist de Despacho para el Staff */
                  <div className="bg-slate-950 border border-slate-850 w-full max-w-md rounded-2xl p-5 md:p-6 text-left shadow-inner flex flex-col gap-4 animate-scale-in">
                    <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Código de Transacción</p>
                        <p className="text-amber-500 text-sm font-black font-mono mt-0.5">{scanResult.transactionId}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-2xs font-extrabold uppercase tracking-wider">
                        🍿 Express Pickup
                      </span>
                    </div>

                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Checklist de Despacho (Toca para marcar):
                    </p>

                    <div className="flex flex-col gap-2">
                      {scanResult.snacks && scanResult.snacks.length > 0 ? (
                        scanResult.snacks.map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCheckedItems(prev => ({ ...prev, [idx]: !prev[idx] }))}
                            className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                              checkedItems[idx] 
                                ? 'bg-emerald-500/10 border-emerald-500 text-white' 
                                : 'bg-slate-900 border-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                                checkedItems[idx] ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'border-slate-700'
                              }`}>
                                {checkedItems[idx] && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                              <span className={`text-sm font-bold ${checkedItems[idx] ? 'line-through text-slate-550 font-medium' : ''}`}>
                                {item.quantity}x {item.name}
                              </span>
                            </div>
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                              checkedItems[idx] ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-950 text-slate-505'
                            }`}>
                              {checkedItems[idx] ? 'Listo' : 'Servir'}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="text-slate-550 text-xs italic text-center py-4">No hay snacks asociados a este ticket</p>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Boleto de Acceso Estándar */
                  <div className="bg-slate-950 border border-slate-850 w-full max-w-md rounded-2xl p-5 md:p-6 text-left shadow-inner">
                    <div className="mb-4">
                      <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Película</p>
                      <p className="text-white text-lg font-black tracking-tight mt-0.5">{scanResult.movie}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-slate-900 pt-4">
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Sala de Cine</p>
                        <p className="text-white font-bold text-sm mt-0.5">{scanResult.room}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Asiento(s)</p>
                        <p className="text-blue-400 font-extrabold text-base mt-0.5 tracking-wide">{scanResult.seats}</p>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="bg-slate-950 border border-slate-850 w-full max-w-md rounded-2xl p-5 md:p-6 shadow-inner">
                  <p className="text-red-400 font-bold text-sm md:text-base leading-relaxed">{scanResult.message}</p>
                </div>
              )}

              <button
                onClick={resetScanner}
                className="btn-primary mt-8 w-full max-w-sm py-4"
              >
                Escanear Siguiente Cliente
              </button>
            </div>
          ) : null}

        </div>

      </div>
    </div>
  );
}
