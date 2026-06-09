import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getAPIUrl, getImageUrl, SOCKET_URL } from '../config/api';
import { useTicket } from '../context/TicketContext';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, Plus, Minus, Popcorn, CupSoda, Cookie, Sparkles, Home, Ticket, Film } from 'lucide-react';
import axios from 'axios';

const localDataMap = {
  's1': {
    description: '1 Pipoca Extra Grande + 2 Refrescos Medianos + 1 Chocolate',
    image: '/cinema_combo_premium.png'
  },
  's2': {
    description: 'Pipoca crujiente con extra mantequilla',
    image: '/cinema_popcorn_classic.png'
  },
  's3': {
    description: 'Coca-Cola, Fanta o Sprite (500ml)',
    image: '/cinema_soda_fountain.png'
  },
  's4': {
    description: '1 Pipoca Mediana + 1 Refresco Pequeño',
    image: '/cinema_combo_personal.png'
  },
  's5': {
    description: 'Sabroso hot dog con aderezos clásicos de cine',
    image: '/cinema_hot_dog.png'
  },
  's6': {
    description: '1 Pipoca Grande, 1 Bebida Grande y 1 porción de nachos con queso y jalapeños',
    image: '/cinema_combo_nachos.png'
  },
  's7': {
    description: '1 Pipoca Gigante + 2 Bebidas Grandes + 1 Hot Dog Premium + 1 Chocolates',
    image: '/cinema_combo_pareja.png'
  },
  's8': {
    description: 'Deliciosa barra de chocolate con leche o dulces confitados',
    image: '/cinema_chocolate.png'
  }
};

const PRODUCT_ORDER = ['s1', 's7', 's6', 's4', 's2', 's5', 's3', 's8'];

export default function CandyBar() {
  const { selectedSnacks, addSnack, removeSnack, selectedSeats, currentFunctionId, clearSeats } = useTicket();
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };
  const [products, setProducts] = React.useState([]);
  const [movie, setMovie] = React.useState(null);

  React.useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get(getAPIUrl('/api/products'));
        const sortedProducts = res.data.data.sort((a, b) => {
          const posA = PRODUCT_ORDER.indexOf(a.id);
          const posB = PRODUCT_ORDER.indexOf(b.id);
          return (posA === -1 ? 999 : posA) - (posB === -1 ? 999 : posB);
        });
        setProducts(sortedProducts);
      } catch (error) {
        console.error('Error al cargar snacks:', error);
      }
    };
    fetchProducts();
  }, []);

  React.useEffect(() => {
    if (currentFunctionId) {
      const fetchFunctionDetails = async () => {
        try {
          const res = await axios.get(getAPIUrl(`/api/functions/${currentFunctionId}`));
          if (res.data.success) {
            setMovie(res.data.data.Movie);
          }
        } catch (err) {
          console.error('Error fetching function details for recommendation:', err);
        }
      };
      fetchFunctionDetails();
    }
  }, [currentFunctionId]);

  // Lógica de recomendación de combos por género
  const getRecommendation = (movie) => {
    const defaultRec = {
      productId: 's1',
      title: 'Combo CineStream Clásico 🍿🥤',
      description: 'El clásico indiscutible: 1 Pipoca Extra Grande + 2 Refrescos Medianos + 1 Chocolate para disfrutar al máximo.',
      icon: '🍿',
      bannerBg: 'from-slate-900 via-slate-850 to-slate-950 border-slate-800'
    };

    if (!movie) return defaultRec;

    const genres = Array.isArray(movie.genre) ? movie.genre : [];
    const isGenre = (g) => genres.some(genre => genre.toLowerCase().includes(g.toLowerCase()));

    if (isGenre('terror') || isGenre('suspenso') || isGenre('horror') || isGenre('gore')) {
      return {
        productId: 's1',
        title: 'Combo Terror Nocturno 🎃',
        description: '¡Perfecto para los sustos! 1 Pipoca Extra Grande + 2 Refrescos Medianos + 1 Chocolate. ¡Agrégale adrenalina a tu función!',
        icon: '🎃',
        bannerBg: 'from-orange-950/40 via-slate-900 to-black border-orange-500/20'
      };
    }

    if (isGenre('animación') || isGenre('fantasía') || isGenre('infantil') || isGenre('familia') || isGenre('family') || isGenre('kids') || isGenre('animacion')) {
      return {
        productId: 's4',
        title: 'Combo Aventura Infantil 🍭',
        description: '¡Diversión garantizada! 1 Pipoca Mediana + 1 Refresco Pequeño + ¡Un juguete coleccionable sorpresa de la película!',
        icon: '🍭',
        bannerBg: 'from-sky-950/40 via-slate-900 to-purple-950/40 border-sky-500/20'
      };
    }

    if (isGenre('acción') || isGenre('ciencia ficción') || isGenre('sci-fi') || isGenre('action') || isGenre('aventura') || isGenre('accion')) {
      return {
        productId: 's1',
        title: 'Combo Galáctico Sci-Fi 🚀',
        description: '¡De otra galaxia! 1 Pipoca Extra Grande + 2 Refrescos Medianos + 1 Chocolate. Energía pura para tus héroes favoritos.',
        icon: '🚀',
        bannerBg: 'from-indigo-950/40 via-slate-900 to-slate-950 border-indigo-500/20'
      };
    }

    if (isGenre('romance') || isGenre('comedia') || isGenre('drama') || isGenre('romantic') || isGenre('comedy')) {
      return {
        productId: 's1',
        title: 'Combo Dúo Romántico 💖',
        description: '¡Ideal para compartir! 2 Refrescos Medianos + 1 Pipoca Extra Grande + Bombones de chocolate para endulzar el momento.',
        icon: '💖',
        bannerBg: 'from-rose-950/40 via-slate-900 to-red-950/40 border-rose-500/20'
      };
    }

    return defaultRec;
  };

  const rec = getRecommendation(movie);
  const recProduct = products.find(p => p.id === rec.productId);
  const recCartItem = recProduct ? selectedSnacks.find(s => s.id === recProduct.id) : null;
  const recQuantity = recCartItem ? recCartItem.quantity : 0;

  // Calcular totales para el Badge
  const totalSnacksItems = selectedSnacks.reduce((acc, item) => acc + item.quantity, 0);
  const totalTickets = selectedSeats.length;
  const totalItems = totalSnacksItems + totalTickets;

  const totalSnacksPrice = selectedSnacks.reduce((acc, item) => acc + (item.price * item.quantity), 0);

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

      {/* Contenido */}
      <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in pb-32 w-full flex-1">
      <div className="text-center mb-12 relative">
        {currentFunctionId && (
          <button 
            type="button"
            onClick={() => navigate(`/seats/${currentFunctionId}`)} 
            className="absolute left-0 top-0 hidden md:flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white transition-all py-2 px-4 rounded-full bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 hover:border-brand-primary/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] cursor-pointer group backdrop-blur-md"
          >
            <svg className="w-4 h-4 text-brand-primary group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a Asientos
          </button>
        )}
        <h1 className="text-4xl font-bold text-white mb-4">CandyBar CineStream</h1>
        <p className="text-slate-400">Acompaña tu película con los mejores snacks y bebidas.</p>
        {!currentFunctionId && (
          <div className="mt-6 max-w-xl mx-auto px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold flex items-center justify-center gap-2">
            <span>🥤</span>
            <span><strong>Retiro Express:</strong> Comprando snacks en línea obtienes un código QR independiente y puedes retirarlos directamente en confitería sin hacer filas.</span>
          </div>
        )}
      </div>

      {/* Banner de Recomendación Inteligente */}
      {recProduct && (
        <div className={`mb-12 rounded-[2rem] bg-gradient-to-r ${rec.bannerBg} border p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden transition-all duration-300`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-6 flex-1">
            <div className="relative w-24 h-24 shrink-0 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
              <img
                src={localDataMap[rec.productId]?.image || '/cinema_combo_premium.png'}
                alt=""
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-brand-primary/20 text-brand-primary border border-brand-primary/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-brand-primary" /> Recomendación Inteligente
                </span>
                {movie && (
                  <span className="text-xs text-slate-400 font-medium">
                    para tu película: <span className="text-white font-bold">{movie.title}</span>
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">{rec.title}</h2>
              <p className="text-slate-400 text-sm mt-2 max-w-2xl">{rec.description}</p>
              <p className="text-2xs text-slate-500 font-mono mt-2">Disponibles en tienda: {recProduct.stock} uds</p>
            </div>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-3 min-w-[180px] w-full md:w-auto border-t md:border-t-0 border-slate-850 pt-4 md:pt-0">
            <div className="text-center md:text-right">
              <span className="text-2xs font-bold text-slate-500 uppercase tracking-widest block">Precio Especial</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">Bs. {parseFloat(recProduct.price).toFixed(2)}</span>
            </div>
            
            {recQuantity === 0 ? (
              <button
                onClick={() => addSnack(recProduct)}
                disabled={recProduct.stock <= 0}
                className="btn-primary w-full md:w-auto text-xs"
              >
                Agregar Combo
              </button>
            ) : (
              <div className="flex items-center space-x-3 bg-slate-800 rounded-xl p-1 border border-slate-700">
                <button
                  onClick={() => removeSnack(recProduct.id)}
                  className="p-1 hover:bg-slate-700 rounded text-slate-350 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-white font-bold w-4 text-center">{recQuantity}</span>
                <button
                  onClick={() => addSnack(recProduct)}
                  disabled={recQuantity >= recProduct.stock}
                  className="p-1 hover:bg-slate-700 rounded text-slate-350 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((snack) => {
          const cartItem = selectedSnacks.find(s => s.id === snack.id);
          const quantity = cartItem ? cartItem.quantity : 0;
          const visualData = localDataMap[snack.id] || { description: 'Snack delicioso', image: '/cinema_combo_premium.png' };

          return (
            <div key={snack.id} className="card-candybar p-6 flex flex-col group">
              <div className="relative w-full h-40 mb-5 rounded-xl overflow-hidden border border-slate-800/85 bg-slate-950 flex items-center justify-center">
                <img
                  src={visualData.image}
                  alt={snack.name}
                  className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2 text-center">{snack.name}</h3>
              <p className="text-slate-400 text-sm text-center mb-2 flex-1">{visualData.description}</p>
              <p className="text-slate-500 text-xs text-center mb-6">Stock disponible: {snack.stock}</p>
              
              <div className="flex items-center justify-between mt-auto border-t border-slate-800 pt-4">
                <span className="text-emerald-400 font-bold text-lg">Bs. {parseFloat(snack.price).toFixed(2)}</span>
                
                {quantity === 0 ? (
                  <button
                    onClick={() => addSnack(snack)}
                    disabled={snack.stock <= 0}
                    className="bg-brand-primary hover:bg-brand-secondary text-white p-2 rounded-xl transition-colors disabled:opacity-50 disabled:hover:bg-brand-primary cursor-pointer"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                ) : (
                  <div className="flex items-center space-x-3 bg-slate-800 rounded-xl p-1">
                    <button
                      onClick={() => removeSnack(snack.id)}
                      className="p-1 hover:bg-slate-700 rounded text-slate-300 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-white font-bold w-4 text-center">{quantity}</span>
                    <button
                      onClick={() => addSnack(snack)}
                      disabled={quantity >= snack.stock}
                      className="p-1 hover:bg-slate-700 rounded text-slate-300 transition-colors disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Cart Badge */}
      {totalItems > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-bounce-slow">
          <div className={`bg-brand-dark/90 backdrop-blur-md border rounded-full px-6 py-3 flex items-center space-x-6 transition-all duration-300 ${
            totalTickets === 0 
              ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]' 
              : 'border-brand-primary shadow-[0_0_20px_rgba(225,29,72,0.4)]'
          }`}>
            
            <div className="flex items-center space-x-3">
              <div className="relative">
                <ShoppingCart className={`w-6 h-6 ${totalTickets === 0 ? 'text-amber-500' : 'text-brand-primary'}`} />
                <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              </div>
              <div className="flex flex-col text-sm">
                <span className="text-white font-medium">
                  {totalTickets === 0 ? (
                    `${totalSnacksItems} ${totalSnacksItems === 1 ? 'Snack' : 'Snacks'}`
                  ) : (
                    `${totalTickets} ${totalTickets === 1 ? 'Entrada' : 'Entradas'} + ${totalSnacksItems} ${totalSnacksItems === 1 ? 'Snack' : 'Snacks'}`
                  )}
                </span>
                {totalSnacksPrice > 0 && (
                  <span className="text-slate-400 text-xs">Snacks: Bs. {totalSnacksPrice.toFixed(2)}</span>
                )}
              </div>
            </div>
 
            <button
              onClick={() => navigate('/checkout')}
              className={`text-white font-bold py-2 px-6 rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                totalTickets === 0 ? 'bg-amber-600 hover:bg-amber-500' : 'bg-brand-primary hover:bg-brand-secondary'
              }`}
            >
              Ir a Pagar
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
