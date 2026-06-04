import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Star, Ticket, Clock, Play, Crown, ChevronLeft, ChevronRight, Film } from 'lucide-react';
import { extractBoliviaTime } from '../utils/dateHelper';
import { useTicket } from '../context/TicketContext';

// Mapa de colores por género
const GENRE_STYLES = {
  'Acción':           { bg: 'bg-red-500/20',     text: 'text-red-300',      border: 'border-red-500/30' },
  'Animación':        { bg: 'bg-pink-500/20',    text: 'text-pink-300',     border: 'border-pink-500/30' },
  'Aventura':         { bg: 'bg-orange-500/20',  text: 'text-orange-300',   border: 'border-orange-500/30' },
  'Ciencia Ficción':  { bg: 'bg-blue-500/20',    text: 'text-blue-300',     border: 'border-blue-500/30' },
  'Comedia':          { bg: 'bg-yellow-500/20',  text: 'text-yellow-300',   border: 'border-yellow-500/30' },
  'Crimen':           { bg: 'bg-stone-500/20',   text: 'text-stone-300',    border: 'border-stone-500/30' },
  'Documental':       { bg: 'bg-teal-500/20',    text: 'text-teal-300',     border: 'border-teal-500/30' },
  'Drama':            { bg: 'bg-emerald-500/20', text: 'text-emerald-300',  border: 'border-emerald-500/30' },
  'Fantasía':         { bg: 'bg-fuchsia-500/20', text: 'text-fuchsia-300',  border: 'border-fuchsia-500/30' },
  'Gore':             { bg: 'bg-rose-900/40',    text: 'text-rose-400',     border: 'border-rose-700/50' },
  'Misterio':         { bg: 'bg-indigo-500/20',  text: 'text-indigo-300',   border: 'border-indigo-500/30' },
  'Romance':          { bg: 'bg-rose-500/20',    text: 'text-rose-300',     border: 'border-rose-500/30' },
  'Superhéroe':       { bg: 'bg-amber-500/20',   text: 'text-amber-300',    border: 'border-amber-500/30' },
  'Suspenso':         { bg: 'bg-violet-500/20',  text: 'text-violet-300',   border: 'border-violet-500/30' },
  'Terror':           { bg: 'bg-purple-900/40',  text: 'text-purple-300',   border: 'border-purple-500/30' },
};
const DEFAULT_GENRE = { bg: 'bg-slate-500/20', text: 'text-slate-300', border: 'border-slate-500/30' };

function GenreBadge({ genre }) {
  const style = GENRE_STYLES[genre] || DEFAULT_GENRE;
  if (!genre) return null;
  return (
    <span className={`badge ${style.bg} ${style.text} border ${style.border}`}>
      {genre}
    </span>
  );
}

// Avatar con inicial del usuario
function UserAvatar({ name }) {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  return (
    <div className="w-8 h-8 rounded-full bg-brand-primary/20 border border-brand-primary/40 flex items-center justify-center">
      <span className="text-brand-primary font-bold text-sm">{initial}</span>
    </div>
  );
}

export default function ClientCatalog() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { clearSeats } = useTicket();

  const [loading, setLoading]                     = useState(true);
  const [error, setError]                         = useState(null);
  const [moviesWithFunctions, setMoviesWithFunctions] = useState([]);
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [dateList, setDateList] = useState([]);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

  useEffect(() => {
    const dates = [];
    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      let label = '';
      let subLabel = '';
      if (i === 0) {
        label = 'Hoy';
        subLabel = `${d.getDate()} de ${months[d.getMonth()]}`;
      } else {
        label = daysOfWeek[d.getDay()];
        subLabel = `${d.getDate()} de ${months[d.getMonth()]}`;
      }
      
      dates.push({ dateString, label, subLabel });
    }
    setDateList(dates);
  }, []);

  useEffect(() => {
    const fetchFunctions = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`http://localhost:3000/api/functions?date=${selectedDate}`);
        const data = response.data.data;
        const groupedMap = data.reduce((acc, func) => {
          const movieId = func.movieId;
          if (!acc[movieId]) acc[movieId] = { movieInfo: func.Movie, functions: [] };
          acc[movieId].functions.push(func);
          return acc;
        }, {});
        setMoviesWithFunctions(Object.values(groupedMap));
        setError(null);
      } catch (err) {
        setError('Lo sentimos, tuvimos un problema al cargar la cartelera de este día.');
      } finally {
        setLoading(false);
      }
    };
    fetchFunctions();
  }, [selectedDate]);

  // Reiniciar index del carrusel cuando cambia el día o cambian las películas cargadas
  useEffect(() => {
    setActiveHeroIndex(0);
  }, [selectedDate, moviesWithFunctions.length]);

  // Rotación automática del carrusel de películas destacadas cada 5 segundos
  useEffect(() => {
    if (moviesWithFunctions.length <= 1) return;
    const interval = setInterval(() => {
      setActiveHeroIndex((prev) => (prev + 1) % moviesWithFunctions.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [moviesWithFunctions.length]);

  const handleLogout = () => { logout(); navigate('/login'); };

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

      {/* ── Hero Spotlight (Netflix/HBO Max Style Carousel) ── */}
      {(() => {
        const currentHero = moviesWithFunctions.length > 0
          ? (moviesWithFunctions[activeHeroIndex] || moviesWithFunctions[0])
          : null;
        const spotlightMovie = currentHero?.movieInfo || null;
        const spotlightFunctions = currentHero?.functions || [];

        return (
          <header className="hero-spotlight relative">
            {/* Backdrops list for cross-fading */}
            {moviesWithFunctions.length > 0 ? (
              moviesWithFunctions.map((item, idx) => {
                const isCurrent = idx === activeHeroIndex;
                const movie = item.movieInfo;
                const backdropUrl = movie?.posterUrl
                  ? `http://localhost:3000${movie.posterUrl}`
                  : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1200&auto=format&fit=crop';
                return (
                  <div 
                    key={idx}
                    className="hero-backdrop" 
                    style={{ 
                      backgroundImage: `linear-gradient(to right, var(--bg-deep) 10%, rgba(9, 13, 22, 0.45) 50%, var(--bg-deep) 90%), linear-gradient(to bottom, transparent 40%, var(--bg-deep) 100%), url(${backdropUrl})`,
                      opacity: isCurrent ? 1 : 0,
                      transition: 'opacity 1s ease-in-out',
                      zIndex: isCurrent ? 1 : 0
                    }} 
                  />
                );
              })
            ) : (
              <div 
                className="hero-backdrop" 
                style={{ 
                  backgroundImage: `linear-gradient(to right, var(--bg-deep) 10%, rgba(9, 13, 22, 0.45) 50%, var(--bg-deep) 90%), linear-gradient(to bottom, transparent 40%, var(--bg-deep) 100%), url(https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1200&auto=format&fit=crop)`,
                  opacity: 1,
                  zIndex: 1
                }} 
              />
            )}

            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 flex items-center justify-between">
              {/* Contenido (triggers mount animation key when index changes) */}
              <div key={activeHeroIndex} className="hero-content animate-slide-up-hero">
                <span className="hero-tag">
                  {spotlightMovie ? 'Película Destacada' : 'Cartelera CineStream'}
                </span>
                <h2 className="hero-title uppercase font-black">
                  {spotlightMovie ? spotlightMovie.title : 'Tu Cine en Casa'}
                </h2>
                <div className="hero-meta">
                  {spotlightMovie?.rating && (
                    <span className="hero-meta-item">
                      ⭐ <span className="hero-rating">{spotlightMovie.rating}</span> / 10
                    </span>
                  )}
                  {spotlightMovie?.duration && (
                    <span className="hero-meta-item">
                      <Clock className="w-4 h-4 text-slate-400 inline" /> {spotlightMovie.duration} min
                    </span>
                  )}
                  <span className="hero-meta-item">
                    {selectedDate === dateList[0]?.dateString ? 'Hoy' : dateList.find(d => d.dateString === selectedDate)?.subLabel || 'Próximamente'}
                  </span>
                  {spotlightMovie && (
                    <>
                      <span className="hero-format-badge font-bold">IMAX 3D</span>
                      <span className="hero-format-badge font-bold">Dolby Atmos</span>
                    </>
                  )}
                </div>
                <p className="hero-desc">
                  {spotlightMovie?.synopsis 
                    ? spotlightMovie.synopsis 
                    : 'Explora nuestra cartelera exclusiva con los mejores estrenos y reservas al instante en la hora oficial de Bolivia.'}
                </p>
                <div className="hero-actions">
                  {spotlightFunctions.length > 0 ? (
                    <button 
                      onClick={() => navigate(`/seats/${spotlightFunctions[0].id}`)}
                      className="btn btn-primary"
                    >
                      Adquirir Boletos
                    </button>
                  ) : (
                    <a href="#cartelera-main" className="btn btn-primary">
                      Explorar Cartelera
                    </a>
                  )}
                  {spotlightMovie && (
                    <button 
                      onClick={() => alert(`Reproduciendo Tráiler Oficial de ${spotlightMovie.title}...`)}
                      className="btn btn-secondary"
                    >
                      <Play className="w-3.5 h-3.5 inline mr-1 fill-current" /> Ver Tráiler
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Carrusel Controls */}
            {moviesWithFunctions.length > 1 && (
              <>
                {/* Botón Anterior */}
                <button 
                  onClick={() => setActiveHeroIndex((prev) => (prev - 1 + moviesWithFunctions.length) % moviesWithFunctions.length)}
                  className="absolute left-6 z-20 w-10 h-10 rounded-full bg-slate-900/60 border border-slate-800/80 text-white flex items-center justify-center hover:bg-slate-850 hover:border-slate-700 hover:scale-105 active:scale-95 transition-all cursor-pointer no-print"
                  aria-label="Anterior película"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Botón Siguiente */}
                <button 
                  onClick={() => setActiveHeroIndex((prev) => (prev + 1) % moviesWithFunctions.length)}
                  className="absolute right-6 z-20 w-10 h-10 rounded-full bg-slate-900/60 border border-slate-800/80 text-white flex items-center justify-center hover:bg-slate-850 hover:border-slate-700 hover:scale-105 active:scale-95 transition-all cursor-pointer no-print"
                  aria-label="Siguiente película"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                
                {/* Indicadores de Puntos (Dots) */}
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 flex gap-2 no-print">
                  {moviesWithFunctions.map((_, idx) => {
                    const isCurrent = idx === activeHeroIndex;
                    return (
                      <button
                        key={idx}
                        onClick={() => setActiveHeroIndex(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                          isCurrent ? 'w-6 bg-blue-500' : 'w-1.5 bg-slate-600 hover:bg-slate-500'
                        }`}
                        aria-label={`Ir al slide ${idx + 1}`}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </header>
        );
      })()}

      {/* ── Contenido Principal ── */}
      <main id="cartelera-main" className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Carrusel de Fechas Premium */}
        <div className="mb-10 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">
              <span className="section-title-bullet"></span> Selecciona la Fecha
            </h3>
            <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider bg-slate-900/40 border border-slate-850 px-2.5 py-1 rounded-lg">Hora local de Bolivia</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {dateList.map((item) => {
              const isActive = selectedDate === item.dateString;
              return (
                <div
                  key={item.dateString}
                  onClick={() => setSelectedDate(item.dateString)}
                  className={`date-capsule ${isActive ? 'active' : ''}`}
                >
                  <span className="capsule-day">
                    {item.label}
                  </span>
                  <span className="capsule-num">
                    {item.subLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-cinema overflow-hidden animate-fade-in">
                <div className="skeleton h-80 w-full" />
                <div className="p-5 space-y-3">
                  <div className="skeleton h-5 w-3/4 rounded" />
                  <div className="skeleton h-4 w-1/2 rounded" />
                  <div className="flex gap-2 mt-4">
                    <div className="skeleton h-10 w-20 rounded-xl" />
                    <div className="skeleton h-10 w-20 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Error al cargar la cartelera</h3>
            <p className="text-slate-400">{error}</p>
          </div>
        ) : moviesWithFunctions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                  d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
            </div>
            <h3 className="text-2xl font-display font-bold text-white mb-3">No hay funciones programadas</h3>
            <p className="text-slate-400 max-w-sm">
              Vuelve más tarde para descubrir nuevos horarios y películas en nuestra cartelera.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {moviesWithFunctions.map((item, idx) => {
              if (!item.movieInfo) return null;
              return (
              <div
                key={idx}
                className="movie-card-premium group"
                style={{ animationDelay: `${idx * 0.08}s` }}
              >
                {/* Póster */}
                <div className="card-poster-area-premium">
                  <img
                    src={`http://localhost:3000${item.movieInfo.posterUrl}`}
                    alt={`Póster de ${item.movieInfo.title}`}
                    loading="lazy"
                    decoding="async"
                    className="card-poster-premium"
                    style={{ opacity: 0, filter: 'blur(8px)', transition: 'opacity 0.5s ease, filter 0.5s ease, transform 0.7s ease' }}
                    onLoad={(e) => { e.target.style.opacity = '1'; e.target.style.filter = 'blur(0px)'; }}
                    onError={(e) => {
                      e.target.style.opacity = '1'; e.target.style.filter = 'blur(0px)';
                      e.target.src = 'https://via.placeholder.com/400x600/111827/475569?text=Sin+P%C3%B3ster';
                    }}
                  />
                  {/* Gradient Mask */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none" />

                  {/* Floating Badges */}
                  <span className="floating-duration-premium">
                    <Clock className="w-3.5 h-3.5 text-slate-300 animate-pulse" /> {item.movieInfo.duration} min
                  </span>
                  {item.movieInfo.rating && (
                    <span className="floating-rating-premium">
                      ⭐ {item.movieInfo.rating}
                    </span>
                  )}
                </div>

                {/* Detalles y Horarios */}
                <div className="card-detail-area">
                  <div className="card-header-block">
                    {item.movieInfo.genre && (
                      <span className="movie-genres">
                        {Array.isArray(item.movieInfo.genre) 
                          ? item.movieInfo.genre.join(' / ')
                          : item.movieInfo.genre
                        }
                      </span>
                    )}
                    <h4 className="movie-title uppercase">
                      {item.movieInfo.title}
                    </h4>
                    <p className="movie-desc">
                      {item.movieInfo.synopsis || 'Disfruta de este gran estreno en nuestras salas con el mejor sonido e imagen digital.'}
                    </p>
                  </div>

                  {/* Horarios */}
                  <div className="showtimes-block">
                    <span className="showtimes-label">
                      Horarios disponibles para reservar
                    </span>
                    <div className="showtimes-list">
                      {item.functions.map((func, fIdx) => {
                        // El primer horario se muestra destacado (¡Últimos asientos!)
                        const isUrgent = fIdx === 0;
                        return (
                          <button
                            key={func.id}
                            onClick={() => navigate(`/seats/${func.id}`)}
                            className={`time-btn-premium ${isUrgent ? 'urgent-premium' : ''}`}
                          >
                            <span className="time-hour-premium">
                              {extractBoliviaTime(func.startTime)}
                            </span>
                            <span className="time-room-premium">
                              {isUrgent ? '¡Últimos asientos!' : func.Room.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
