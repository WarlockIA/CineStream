import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toastError, toastSuccess } from '../utils/toastHelper';
import { Mail, Lock, Eye, EyeOff, Film, ArrowRight } from 'lucide-react';

export default function LoginForm() {
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('cinestream_remember_email') || '';
  });
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return !!localStorage.getItem('cinestream_remember_email');
  });
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [capsLock, setCapsLock] = useState(false);

  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'staff') {
        navigate('/pos');
      } else if (user.role === 'porter') {
        navigate('/portero');
      } else {
        navigate('/movies');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const checkCapsLock = (e) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLock(true);
    } else {
      setCapsLock(false);
    }
  };

  // Sistema de partículas y haz de luz de proyector (Film dust/projector flicker)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles = [];
    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.2 + 0.6,
        speedX: Math.random() * 0.2 - 0.1,
        speedY: -(Math.random() * 0.45 + 0.15), // flotar hacia arriba
        opacity: Math.random() * 0.45 + 0.1,
      });
    }

    let beamOpacity = 0.14;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Simular parpadeo sutil del proyector de cine
      if (Math.random() > 0.97) {
        beamOpacity = Math.random() * 0.06 + 0.11;
      }

      // Haz de luz de proyector
      const gradient = ctx.createRadialGradient(0, 0, 20, width * 0.7, height * 0.7, Math.max(width, height));
      gradient.addColorStop(0, `rgba(59, 130, 246, ${beamOpacity})`);
      gradient.addColorStop(0.3, `rgba(124, 58, 237, ${beamOpacity * 0.45})`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width, height * 0.35);
      ctx.lineTo(width * 0.35, height);
      ctx.closePath();
      ctx.fill();

      // Dibujar partículas flotantes (polvo/bokeh)
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${p.opacity})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#3B82F6';
        ctx.fill();

        p.x += p.speedX;
        p.y += p.speedY;

        // Reiniciar cuando salen de pantalla
        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }
        if (p.x < 0 || p.x > width) {
          p.speedX = -p.speedX;
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const validate = () => {
    let isValid = true;
    
    if (!email.trim()) {
      setEmailError('Por favor, ingresa tu correo electrónico.');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Por favor, ingresa un correo electrónico válido.');
      isValid = false;
    } else {
      setEmailError('');
    }

    if (!password.trim()) {
      setPasswordError('La contraseña no puede estar vacía.');
      isValid = false;
    } else {
      setPasswordError('');
    }

    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', { email, password });
      const { token, user } = response.data.data;
      
      if (rememberMe) {
        localStorage.setItem('cinestream_remember_email', email);
      } else {
        localStorage.removeItem('cinestream_remember_email');
      }

      login(token, user);
      toastSuccess('¡Bienvenido a CineStream!');
      if (user.role === 'admin')       navigate('/admin');
      else if (user.role === 'staff')  navigate('/pos');
      else if (user.role === 'porter') navigate('/portero');
      else                             navigate('/movies');
    } catch (err) {
      if (err.response?.data?.message) toastError(err.response.data.message);
      else toastError('Ocurrió un error al intentar iniciar sesión. Verifica el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    toastSuccess('Para restablecer tu contraseña, ponte en contacto con el administrador del sistema.', {
      duration: 5000,
      icon: '🔑',
    });
  };

  return (
    <div className="min-h-screen w-full flex bg-[#070B14] text-slate-100 font-sans overflow-hidden">
      
      {/* ── SECCIÓN IZQUIERDA: SPLIT SCREEN (Cinema Background & Brand Vibe) ── */}
      <div className="hidden md:flex md:w-1/2 relative flex-col justify-between p-16 overflow-hidden select-none">
        {/* Imagen de fondo premium con efecto zoom sutil en hover */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[12000ms] hover:scale-[1.07]"
          style={{ backgroundImage: "url('/login_cinema_bg.png')" }}
        />
        {/* Overlay degradado cinematográfico oscuro */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-[#070B14]/80 to-[#070B14]" />
        
        {/* Canvas de partículas dinámicas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />
        
        {/* Orbes de luz de fondo sutiles */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Header - Brand Logo */}
        <div className="relative z-10 flex items-center gap-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 p-0.5 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <div className="w-full h-full bg-[#070B14] rounded-[10px] flex items-center justify-center">
              <Film className="w-5 h-5 text-blue-500 animate-pulse" />
            </div>
          </div>
          <span className="text-xl font-bold tracking-wider font-display uppercase">
            Cine<span className="text-blue-500">Stream</span>
          </span>
        </div>

        {/* Centro - Contenido motivacional */}
        <div className="relative z-10 my-auto max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider animate-slide-up" style={{ animationDelay: '200ms' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
            Nueva Versión 2.0
          </div>
          <h2 className="text-5xl font-extrabold tracking-tight leading-tight text-white font-display animate-slide-up" style={{ animationDelay: '300ms' }}>
            La experiencia del cine <br />
            <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
              en tus manos.
            </span>
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed animate-slide-up" style={{ animationDelay: '400ms' }}>
            Administra salas, vende boletos, controla el inventario de snacks y analiza tus ingresos en tiempo real con nuestra plataforma unificada.
          </p>
        </div>

        {/* Footer izquierdo */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 pt-6 animate-fade-in" style={{ animationDelay: '500ms' }}>
          <span>© 2026 CineStream Inc.</span>
          <div className="flex gap-4">
            <span className="hover:text-slate-300 cursor-pointer transition-colors">Seguridad</span>
            <span className="hover:text-slate-300 cursor-pointer transition-colors">Soporte</span>
          </div>
        </div>
      </div>

      {/* ── SECCIÓN DERECHA: FORMULARIO DE LOGIN ── */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-4 sm:p-8 md:p-12 relative bg-[#070B14]">
        {/* Luces de fondo sutiles para la derecha */}
        <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-0 md:left-auto md:right-1/4 w-[300px] h-[300px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Card de Vidrio Esmerilado (Glassmorphism) */}
        <div className="w-full max-w-md bg-[#0a0f1d]/50 backdrop-blur-xl border border-white/5 md:border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-7 relative z-10 animate-slide-up">
          
          {/* Logo y Encabezado */}
          <div className="text-center md:text-left space-y-3">
            <div className="md:hidden inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 p-0.5 mb-2 shadow-[0_0_24px_rgba(59,130,246,0.35)]">
              <div className="w-full h-full bg-[#070B14] rounded-[14px] flex items-center justify-center">
                <Film className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white font-display">
              Cine<span className="text-blue-500">Stream</span>
            </h1>
            <p className="text-slate-400 text-sm md:text-base font-medium">
              Tu plataforma de cine digital
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Campo Correo con Floating Label */}
            <div className="space-y-1">
              <div className="relative group">
                <div className="absolute left-4 top-[18px] text-slate-500 pointer-events-none group-focus-within:text-blue-500 transition-colors duration-200">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  className={`w-full bg-[#0b0f19]/70 border ${
                    emailError ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-800 focus:border-blue-600 focus:ring-blue-600/10'
                  } rounded-xl pt-6 pb-2 pl-12 pr-10 text-white placeholder-transparent focus:outline-none focus:ring-4 transition-all duration-300 peer`}
                  placeholder="nombre@cinestream.com"
                  autoComplete="email"
                />
                <label 
                  htmlFor="login-email" 
                  className={`absolute left-12 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none transition-all duration-300 peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:text-2xs peer-focus:scale-95 peer-focus:translate-y-0 peer-focus:text-blue-500 origin-left ${
                    email ? 'top-2 text-2xs scale-95 translate-y-0 text-blue-500/80' : ''
                  }`}
                >
                  Correo Electrónico
                </label>
                
                {/* Validador en tiempo real (Icono Check verde) */}
                {email && !emailError && /\S+@\S+\.\S+/.test(email) && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 animate-scale-in">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              {emailError && (
                <p className="text-red-400 text-2xs mt-1 flex items-center gap-1 animate-fade-in pl-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
                  {emailError}
                </p>
              )}
            </div>

            {/* Campo Contraseña con Floating Label */}
            <div className="space-y-1">
              <div className="relative group">
                <div className="absolute left-4 top-[18px] text-slate-500 pointer-events-none group-focus-within:text-blue-500 transition-colors duration-200">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  onKeyDown={checkCapsLock}
                  onKeyUp={checkCapsLock}
                  className={`w-full bg-[#0b0f19]/70 border ${
                    passwordError ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-800 focus:border-blue-600 focus:ring-blue-600/10'
                  } rounded-xl pt-6 pb-2 pl-12 pr-12 text-white placeholder-transparent focus:outline-none focus:ring-4 transition-all duration-300 peer`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <label 
                  htmlFor="login-password" 
                  className={`absolute left-12 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none transition-all duration-300 peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:text-2xs peer-focus:scale-95 peer-focus:translate-y-0 peer-focus:text-blue-500 origin-left ${
                    password ? 'top-2 text-2xs scale-95 translate-y-0 text-blue-500/80' : ''
                  }`}
                >
                  Contraseña
                </label>
                
                {/* Botón de visibilidad */}
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {capsLock && (
                <p className="text-amber-500 text-2xs mt-1 flex items-center gap-1 animate-fade-in pl-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Bloqueo de mayúsculas activado
                </p>
              )}
              {passwordError && (
                <p className="text-red-400 text-2xs mt-1 flex items-center gap-1 animate-fade-in pl-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
                  {passwordError}
                </p>
              )}
            </div>

            {/* Extras */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-800 bg-[#0b0f19] text-blue-600 focus:ring-blue-600/30 focus:ring-offset-[#070B14] w-4 h-4 cursor-pointer"
                />
                <span className="text-slate-400 group-hover:text-slate-300 transition-colors select-none">
                  Recordarme en este dispositivo
                </span>
              </label>

              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors hover:underline text-left"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Botón Ingresar */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full relative overflow-hidden group bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-500 hover:to-purple-600 text-white font-bold py-4 rounded-xl transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-[0_4px_20px_rgba(59,130,246,0.25)] hover:shadow-[0_8px_30px_rgba(59,130,246,0.45)] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <>
                  <span>Ingresar a la plataforma</span>
                  <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Panel de Acceso Rápido para Testing E2E */}
          <div className="pt-4 border-t border-slate-800/50">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-center mb-3">
              Acceso Rápido (Pruebas)
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { name: 'Admin', email: 'admin@cinestream.com', pass: 'admin' },
                { name: 'Staff', email: 'staff@cinestream.com', pass: 'staff' },
                { name: 'Portero', email: 'portero@cinestream.com', pass: '123' },
                { name: 'Cliente', email: 'cliente@cinestream.com', pass: '123' }
              ].map((role) => (
                <button
                  key={role.name}
                  type="button"
                  onClick={() => {
                    setEmail(role.email);
                    setPassword(role.pass);
                    setEmailError('');
                    setPasswordError('');
                    // Se quitó el toastSuccess para que no salgan los mensajes molestos
                  }}
                  className="py-2 px-1 bg-slate-900/55 hover:bg-blue-950/40 border border-slate-800/80 hover:border-blue-500/35 text-xs font-semibold rounded-lg text-slate-400 hover:text-blue-400 transition-all duration-200 text-center focus:outline-none"
                >
                  {role.name}
                </button>
              ))}
            </div>
          </div>
          {/* Pie de Página */}
          <div className="pt-5 border-t border-slate-800/50 text-center space-y-3">
            <p className="text-xs text-slate-500">
              ¿Problemas para acceder?{' '}
              <button 
                type="button"
                onClick={() => toastSuccess('Contacta a soporte en soporte@cinestream.com o llama al administrador en la ext. 4412.')}
                className="text-blue-400/90 hover:text-blue-400 hover:underline transition-colors focus:outline-none"
              >
                Contacta al administrador
              </button>
            </p>
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
              CineStream v2.0 · © 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
