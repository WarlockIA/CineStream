import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';

// Carga diferida (Lazy Loading) para Code Splitting
const LoginForm = lazy(() => import('./components/LoginForm'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const ClientCatalog = lazy(() => import('./components/ClientCatalog'));
const CandyBar = lazy(() => import('./components/CandyBar'));
const Checkout = lazy(() => import('./components/Checkout'));
const PorteroPanel = lazy(() => import('./components/PorteroPanel'));
const PosPanel = lazy(() => import('./components/PosPanel'));
const SeatSelection = lazy(() => import('./components/SeatSelection'));
const ThankYou = lazy(() => import('./components/ThankYou'));
const MyTickets = lazy(() => import('./components/MyTickets'));
const UserProfile = lazy(() => import('./components/UserProfile'));

// Pantalla de carga branded para el Suspense de React
const FallbackSpinner = () => (
  <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center animate-fade-in">
    {/* Logo animado */}
    <div className="flex flex-col items-center mb-10">
      <div className="relative w-16 h-16 mb-5">
        {/* Anillo giratorio */}
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{ border: '2px solid transparent', borderTopColor: '#3B82F6', borderRightColor: 'rgba(59,130,246,0.2)' }}
        />
        {/* Ícono central */}
        <div className="absolute inset-1 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
          <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
              d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
          </svg>
        </div>
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-1"
        style={{ fontFamily: 'Montserrat, Inter, sans-serif' }}>
        <span className="text-white">Cine</span>
        <span className="text-blue-400">Stream</span>
      </h1>
      <p className="text-slate-500 text-sm">Preparando tu experiencia...</p>
    </div>

    {/* Barra de progreso indeterminada */}
    <div className="w-48 h-0.5 rounded-full overflow-hidden bg-slate-800">
      <div
        className="h-full rounded-full"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, #3B82F6 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s ease-in-out infinite',
          width: '60%',
        }}
      />
    </div>
  </div>
);

function App() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        document.body.classList.add('scrolled-nav');
      } else {
        document.body.classList.remove('scrolled-nav');
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={10}
        toastOptions={{
          duration: 3500,
          style: {
            fontFamily: "'Inter', system-ui, sans-serif",
          },
        }}
      />
      
      <Suspense fallback={<FallbackSpinner />}>
        <Routes>
          <Route 
            path="/" 
            element={
              isAuthenticated 
                ? user?.role === 'admin' 
                  ? <Navigate to="/admin" />
                  : user?.role === 'staff'
                    ? <Navigate to="/pos" />
                    : user?.role === 'porter'
                      ? <Navigate to="/portero" />
                      : <Navigate to="/movies" />
                : <Navigate to="/login" />
            } 
          />
          <Route path="/login" element={<LoginForm />} />
          
          {/* Ruta protegida para administradores */}
          <Route 
            path="/admin" 
            element={
              isAuthenticated && user?.role === 'admin' 
                ? <AdminPanel /> 
                : <Navigate to="/login" />
            } 
          />

          {/* Ruta protegida para Personal POS */}
          <Route 
            path="/pos" 
            element={
              isAuthenticated && (user?.role === 'staff' || user?.role === 'admin') 
                ? <PosPanel /> 
                : <Navigate to="/login" />
            } 
          />

          {/* Rutas futuras (Portero y Checkout) */}
          <Route 
            path="/seats/:functionId" 
            element={
              isAuthenticated 
                ? <SeatSelection /> 
                : <Navigate to="/login" />
            } 
          />
          <Route 
            path="/portero" 
            element={
              isAuthenticated && user?.role === 'porter' 
                ? <PorteroPanel /> 
                : <Navigate to="/login" />
            } 
          />
          <Route 
            path="/checkout" 
            element={
              isAuthenticated 
                ? <Checkout /> 
                : <Navigate to="/login" />
            } 
          />
          <Route 
            path="/candybar" 
            element={
              isAuthenticated 
                ? <CandyBar /> 
                : <Navigate to="/login" />
            } 
          />
          <Route 
            path="/thank-you" 
            element={
              isAuthenticated 
                ? <ThankYou /> 
                : <Navigate to="/login" />
            } 
          />
          <Route 
            path="/purchase-success" 
            element={
              isAuthenticated 
                ? <ThankYou /> 
                : <Navigate to="/login" />
            } 
          />
          <Route 
            path="/my-tickets" 
            element={
              isAuthenticated 
                ? <MyTickets /> 
                : <Navigate to="/login" />
            } 
          />
          <Route 
            path="/profile" 
            element={
              isAuthenticated 
                ? <UserProfile /> 
                : <Navigate to="/login" />
            } 
          />
          
          {/* Ruta protegida para clientes */}
          <Route 
            path="/movies" 
            element={
              isAuthenticated 
                ? <ClientCatalog /> 
                : <Navigate to="/login" />
            } 
          />

          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
