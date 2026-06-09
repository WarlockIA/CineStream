import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getAPIUrl, getImageUrl, SOCKET_URL } from '../config/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTicket } from '../context/TicketContext';
import { toastSuccess, toastError, toastPromise } from '../utils/toastHelper';
import html2canvas from 'html2canvas';
import ErrorBoundary from './ErrorBoundary';
import { Plus, Minus, Ticket, Popcorn, Film } from 'lucide-react';

export default function Checkout() {
  const { token, user, logout } = useAuth();
  const handleLogout = () => { logout(); navigate('/login'); };
  const { selectedSeats, selectedSnacks, currentFunctionId, clearSeats } = useTicket();
  const isSnackOnly = selectedSeats.length === 0 && !currentFunctionId && selectedSnacks.length > 0;
  const navigate = useNavigate();
  const qrVoucherRef = useRef(null);

  const [funcDetails, setFuncDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(true);

  // Form state (card simulation)
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  // QR Payment state
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [qrPaymentData, setQrPaymentData] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);

  // Coupon state
  const [coupons, setCoupons] = useState([]);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  // Club CineStream & Benefit States
  const [userProfile, setUserProfile] = useState(null);
  const [usePremiumTickets, setUsePremiumTickets] = useState(false);
  const [usePointsForTickets, setUsePointsForTickets] = useState(false);
  const [redeemedSnacks, setRedeemedSnacks] = useState([]);

  const hasValidated = useRef(false);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const res = await axios.get(getAPIUrl('/api/users/coupons'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCoupons(res.data.data || []);
      } catch (err) {
        console.error('Error fetching checkout coupons:', err);
      }
    };
    if (token) fetchCoupons();
  }, [token]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(getAPIUrl('/api/users/profile'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserProfile(res.data.data.profile);
      } catch (err) {
        console.error('Error fetching user profile for checkout:', err);
      }
    };
    if (token) fetchProfile();
  }, [token]);

  const handleApplyCoupon = async (codeToApply) => {
    if (!codeToApply) return;
    setCouponLoading(true);
    try {
      const res = await axios.post(getAPIUrl('/api/bookings/apply-coupon'), 
        { code: codeToApply },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAppliedCoupon(res.data.data);
      toastSuccess('¡Cupón aplicado con éxito!');
    } catch (err) {
      toastError(err.response?.data?.message || 'Cupón inválido o vencido.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
  };

  useEffect(() => {
    if (hasValidated.current) return;
    if (!isSnackOnly && (!currentFunctionId || selectedSeats.length === 0)) {
      toastError('No hay asientos seleccionados en tu carrito.');
      navigate('/movies');
      return;
    }
    if (isSnackOnly) {
      setFuncDetails(null);
      setLoadingDetails(false);
      hasValidated.current = true;
      return;
    }
    const fetchFunctionDetails = async () => {
      try {
        const res = await axios.get(getAPIUrl(`/api/functions/${currentFunctionId}`));
        setFuncDetails(res.data.data);
        hasValidated.current = true;
      } catch (error) {
        toastError('Error al cargar los detalles de la función.');
        navigate('/movies');
      } finally {
        setLoadingDetails(false);
      }
    };
    fetchFunctionDetails();
  }, [currentFunctionId, selectedSeats, isSnackOnly, navigate]);

  // QR expiration countdown
  useEffect(() => {
    if (!qrPaymentData) return;
    if (timeLeft <= 0) {
      toastError('El tiempo para pagar ha expirado. Los asientos han sido liberados.');
      clearSeats();
      navigate('/movies');
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [qrPaymentData, timeLeft, navigate, clearSeats]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getPointsForSnack = (id) => {
    if (id === 's3') return 30;
    if (id === 's2') return 50;
    return 80;
  };

  const pointsForTickets = usePointsForTickets ? (selectedSeats.length * 100) : 0;
  const pointsForSnacks = redeemedSnacks.reduce((acc, id) => acc + getPointsForSnack(id), 0);
  const totalPointsNeeded = pointsForTickets + pointsForSnacks;

  const snackDiscountRate = userProfile?.isPremium 
    ? (userProfile?.premiumTier === 'Gold' ? 0.15 : (userProfile?.premiumTier === 'Platinum' ? 0.25 : (userProfile?.premiumTier === 'CineStreamPass' ? 0.30 : 0))) 
    : 0;

  // Calcular valores dinámicos
  let premiumTicketsUsed = 0;
  if (usePremiumTickets && userProfile) {
    if (userProfile.premiumTier === 'CineStreamPass') {
      premiumTicketsUsed = userProfile.hasUsedPassToday ? 0 : Math.min(1, selectedSeats.length, userProfile.premiumTicketsLeft || 0);
    } else {
      premiumTicketsUsed = Math.min(selectedSeats.length, userProfile.premiumTicketsLeft || 0);
    }
  }
  const ticketPricePerSeat = funcDetails ? parseFloat(funcDetails.price) : 0;
  const finalTicketsPrice = usePointsForTickets 
    ? 0 
    : (selectedSeats.length - premiumTicketsUsed) * ticketPricePerSeat;

  let finalSnacksPrice = 0;
  const processedSnacksList = selectedSnacks.map(snack => {
    const qtyRedeemed = redeemedSnacks.filter(id => id === snack.id).length;
    const qtyChargeable = Math.max(0, snack.quantity - qtyRedeemed);
    const basePrice = parseFloat(snack.price) * qtyChargeable;
    const discount = basePrice * snackDiscountRate;
    const snackFinalPrice = basePrice - discount;
    finalSnacksPrice += snackFinalPrice;
    return {
      ...snack,
      redeemedQuantity: qtyRedeemed,
      finalPrice: snackFinalPrice
    };
  });

  const baseTotalPrice = finalTicketsPrice + finalSnacksPrice;
  const couponDiscount = appliedCoupon ? Math.min(appliedCoupon.value, baseTotalPrice) : 0;
  const netTotalPrice = Math.max(0, baseTotalPrice - couponDiscount);

  const handleCheckout = async (e) => {
    e.preventDefault();

    if (netTotalPrice > 0 && paymentMethod === 'card') {
      if (cardNumber.replace(/\s/g, '').length < 16 || expiry.length < 5 || cvc.length < 3) {
        return toastError('Por favor ingresa datos de tarjeta válidos (simulados).');
      }
    }

    const payload = {
      functionId: isSnackOnly ? null : currentFunctionId,
      seatNumbers: isSnackOnly ? [] : selectedSeats,
      snacks: selectedSnacks,
      totalPrice: baseTotalPrice,
      paymentMethod: appliedCoupon && appliedCoupon.value >= baseTotalPrice ? 'coupon' : paymentMethod,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      usePremiumTickets: isSnackOnly ? false : usePremiumTickets,
      usePointsForTickets: isSnackOnly ? false : usePointsForTickets,
      redeemSnacks: redeemedSnacks,
      ...(paymentMethod === 'card' && netTotalPrice > 0 && { paymentToken: 'tok_visa_simulated', cardNumber }),
    };

    const checkoutPromise = axios.post(getAPIUrl('/api/bookings/checkout'), payload, {
      headers: { Authorization: `Bearer ${token}` },
    });

    toastPromise(checkoutPromise, {
      loading: netTotalPrice === 0 ? 'Procesando beneficio...' : (paymentMethod === 'QR' ? 'Generando QR de pago...' : 'Conectando con pasarela de pagos segura...'),
      success: netTotalPrice === 0 ? '¡Compra completada con éxito!' : (paymentMethod === 'QR' ? 'Escanea el código QR para pagar' : '¡Compra exitosa! Revisa tu correo.'),
      error: (err) => {
        if (err.response?.status === 409) return 'Los asientos ya no están disponibles.';
        if (err.response?.status === 504) return 'Timeout: La pasarela de pago no respondió (504).';
        if (err.response?.status === 402) return 'Pago rechazado: Revisa los datos de tu tarjeta (402).';
        return err.response?.data?.message || 'Hubo un error al procesar el pago.';
      },
    })
      .then((response) => {
        const data = response.data.data;
        if (data.isQrPayment) {
          setQrPaymentData(data);
        } else {
          clearSeats();
          navigate('/purchase-success', { state: { ticketData: data } });
        }
      })
      .catch(() => {});
  };

  const handleConfirmQrPayment = async () => {
    setIsConfirming(true);
    try {
      const response = await axios.post(
        getAPIUrl('/api/bookings/confirm-qr-payment'),
        { transactionId: qrPaymentData.transactionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toastSuccess('¡Pago confirmado! Revisa tu ticket.');
      clearSeats();
      navigate('/purchase-success', { state: { ticketData: response.data.data } });
    } catch (err) {
      toastError(err.response?.data?.message || 'Aún no recibimos tu pago o hubo un error.');
    } finally {
      setIsConfirming(false);
    }
  };

  const downloadVoucher = async () => {
    if (!qrVoucherRef.current) return;
    try {
      const canvas = await html2canvas(qrVoucherRef.current, { backgroundColor: '#ffffff', scale: 2 });
      const link = document.createElement('a');
      link.download = `Voucher_CineStream_Bs${netTotalPrice.toFixed(2)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toastSuccess('¡Voucher guardado con éxito!');
    } catch (err) {
      console.error(err);
      toastError('Hubo un error al guardar el voucher de pago.');
    }
  };

  if (loadingDetails) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-300 animate-pulse">
        Cargando detalles de tu compra...
      </div>
    );
  }

  if (!isSnackOnly && !funcDetails) return null;

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

      <div className="flex-1 max-w-5xl mx-auto px-4 py-8 animate-fade-in w-full" translate="no">
      <ErrorBoundary onReset={() => { setPaymentMethod('card'); setQrPaymentData(null); }}>
        
        {/* Header Compra */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-800/60">
          
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={() => navigate('/candybar')} 
              className="flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white transition-all py-2 px-4 rounded-full bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 hover:border-brand-primary/50 hover:shadow-[0_0_15px_rgba(225,29,72,0.2)] cursor-pointer group backdrop-blur-md"
              title="Añadir más snacks"
            >
              <svg className="w-4 h-4 text-brand-primary group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver a Dulcería
            </button>
            <div className="h-6 w-px bg-slate-700 hidden sm:block" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/20 border border-brand-primary/40 flex items-center justify-center shadow-[0_0_20px_rgba(225,29,72,0.3)]">
                <svg className="w-5 h-5 text-brand-primary drop-shadow-[0_0_8px_rgba(225,29,72,0.8)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
              </div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-slate-400 tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Finalizar Compra
              </h1>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">

          {/* ─── Order Summary (Left) ─── */}
          <div className="w-full lg:w-1/3">
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 shadow-xl sticky top-8">
              <h2 className="text-xl font-semibold text-white mb-6 border-b border-slate-700 pb-3">Resumen del Pedido</h2>

              {!isSnackOnly ? (
                <>
                  <div className="flex gap-4 mb-6">
                    {funcDetails.Movie?.posterUrl ? (
                      <img
                        src={getImageUrl(funcDetails.Movie.posterUrl)}
                        alt={funcDetails.Movie.title}
                        className="w-24 h-36 object-cover rounded-lg shadow-md"
                      />
                    ) : (
                      <div className="w-24 h-36 bg-slate-800 rounded-lg flex items-center justify-center">
                        <span className="text-slate-500 text-xs text-center p-2">Sin Póster</span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-lg text-white mb-1">{funcDetails.Movie?.title}</h3>
                      <p className="text-slate-400 text-sm mb-2">{funcDetails.Room?.name}</p>
                      <p className="text-sm text-brand-primary">
                        {new Date(funcDetails.startTime).toLocaleString('es-BO', {
                          weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6 border-t border-slate-700 pt-4">
                    <div className="flex justify-between text-slate-300 font-bold mb-2"><span>CINE</span></div>
                    <div className="flex justify-between text-slate-300">
                      <span>Entradas ({selectedSeats.length})</span>
                      <span>Bs. {funcDetails.price} c/u</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Asientos:</span>
                      <span className="font-medium text-white">{selectedSeats.join(', ')}</span>
                    </div>
                    {usePremiumTickets && premiumTicketsUsed > 0 && (
                      <div className="flex justify-between text-yellow-450 text-xs font-semibold pl-2">
                        <span>{userProfile?.premiumTier === 'CineStreamPass' ? 'Pase CineStream Pass Usado:' : 'Boletos Premium Usados:'}</span>
                        <span>-{premiumTicketsUsed} (-Bs. {(premiumTicketsUsed * ticketPricePerSeat).toFixed(2)})</span>
                      </div>
                    )}
                    {usePointsForTickets && (
                      <div className="flex justify-between text-blue-450 text-xs font-bold pl-2">
                        <span>Canjeado con Puntos:</span>
                        <span>-{selectedSeats.length * 100} pts</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-400 text-sm border-t border-slate-800/40 pt-2">
                      <span>Subtotal Cine:</span>
                      <span>Bs. {finalTicketsPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mb-6 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-center relative overflow-hidden flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3">
                    <span className="text-3xl animate-bounce-slow">🍿</span>
                  </div>
                  <h3 className="font-bold text-base text-white mb-1">CineStream Express Pickup</h3>
                  <p className="text-amber-400 text-xs font-semibold mb-2">Compra Directa de Confitería</p>
                  <p className="text-slate-400 text-2xs leading-normal px-2">
                    Retira tus snacks y bebidas directamente en la barra física presentando tu Express Pickup QR sin hacer filas de caja.
                  </p>
                </div>
              )}

              {selectedSnacks.length > 0 && (
                <div className="space-y-3 mb-6 border-t border-slate-700 pt-4">
                  <div className="flex justify-between text-slate-300 font-bold mb-2"><span>DULCERÍA</span></div>
                  {processedSnacksList.map((snack) => {
                    const pointsCost = getPointsForSnack(snack.id) * snack.redeemedQuantity;
                    return (
                      <div key={snack.id} className="text-slate-300 text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="truncate pr-2">{snack.quantity}x {snack.name}</span>
                          <span>Bs. {(snack.price * snack.quantity).toFixed(2)}</span>
                        </div>
                        {snack.redeemedQuantity > 0 && (
                          <div className="flex justify-between text-blue-400 text-xs pl-2 font-semibold">
                            <span>Canjeado con puntos ({snack.redeemedQuantity} ud):</span>
                            <span>-{pointsCost} pts</span>
                          </div>
                        )}
                        {snackDiscountRate > 0 && (snack.quantity - snack.redeemedQuantity) > 0 && (
                          <div className="flex justify-between text-yellow-450 text-xs pl-2 font-semibold">
                            <span>Descuento Premium ({snackDiscountRate * 100}%):</span>
                            <span>-Bs. {((snack.price * (snack.quantity - snack.redeemedQuantity)) * snackDiscountRate).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="flex justify-between text-slate-400 text-sm border-t border-slate-800/40 pt-2">
                    <span>Subtotal Dulcería:</span>
                    <span>Bs. {finalSnacksPrice.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {appliedCoupon && (
                <div className="space-y-3 mb-6 border-t border-slate-700 pt-4">
                  <div className="flex justify-between text-slate-400 text-sm">
                    <span>Subtotal original:</span>
                    <span>Bs. {baseTotalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 text-sm">
                    <span>Descuento Cupón ({appliedCoupon.code}):</span>
                    <span>-Bs. {couponDiscount.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center text-xl font-bold text-white border-t border-slate-700 pt-4">
                <span>Total a Pagar:</span>
                <span className="text-emerald-400 font-mono">Bs. {netTotalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* ─── Payment Form (Right) ─── */}
          <div className="w-full lg:w-2/3">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
              
              {/* ─── Club CineStream y Canjes ─── */}
              {userProfile && (
                <div className="mb-8 border-b border-slate-800 pb-8 animate-fade-in">
                  <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                    <span className="text-brand-accent">✨</span> Club CineStream y Beneficios
                  </h3>
                  
                  <div className="bg-slate-950/60 border border-slate-850 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                      <div>
                        <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Mi Membresía</span>
                        <span className="text-sm font-bold text-white">
                          {userProfile.isPremium ? `Miembro Premium ${userProfile.premiumTier}` : `Socio ${userProfile.membershipLevel}`}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">StreamPoints Disponibles</span>
                        <span className="text-base font-black text-brand-gold font-mono">{userProfile.points} pts</span>
                      </div>
                    </div>

                    {!isSnackOnly && userProfile.isPremium && userProfile.premiumTicketsLeft > 0 && (
                      <div className={`flex items-center justify-between p-3 rounded-xl border ${
                        userProfile.premiumTier === 'CineStreamPass'
                          ? 'bg-amber-500/5 border-amber-500/20'
                          : 'bg-yellow-500/5 border-yellow-500/20'
                      }`}>
                        <div>
                           <p className={`text-xs font-bold ${userProfile.premiumTier === 'CineStreamPass' ? 'text-amber-400' : 'text-yellow-400'}`}>
                             {userProfile.premiumTier === 'CineStreamPass' ? 'Usar Pase CineStream Pass' : 'Usar Boletos Premium'}
                           </p>
                           <p className="text-2xs text-slate-400">
                             {userProfile.premiumTier === 'CineStreamPass'
                               ? `Tienes ${userProfile.premiumTicketsLeft} pases de mes disponibles. 1 boleto gratis por día.`
                               : `Tienes ${userProfile.premiumTicketsLeft} boletos mensuales disponibles.`}
                           </p>
                           {userProfile.premiumTier === 'CineStreamPass' && userProfile.hasUsedPassToday && (
                             <p className="text-[10px] text-rose-450 mt-1 font-bold">⚠️ Ya usaste tu pase de hoy. Límite: 1 pase/día.</p>
                           )}
                           {userProfile.premiumTier === 'CineStreamPass' && !userProfile.hasUsedPassToday && usePremiumTickets && (
                             <p className="text-[10px] text-emerald-400 mt-1">✓ Se aplicará 1 entrada a costo 0 Bs. en esta compra.</p>
                           )}
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={usePremiumTickets}
                            onChange={(e) => {
                              setUsePremiumTickets(e.target.checked);
                              if (e.target.checked) setUsePointsForTickets(false);
                            }}
                            disabled={usePointsForTickets || (userProfile.premiumTier === 'CineStreamPass' && userProfile.hasUsedPassToday)}
                            className="sr-only peer"
                          />
                          <div className={`w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-350 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                            userProfile.premiumTier === 'CineStreamPass'
                              ? 'peer-checked:bg-amber-500 peer-checked:after:bg-slate-950'
                              : 'peer-checked:bg-yellow-500 peer-checked:after:bg-slate-950'
                          }`} />
                        </label>
                      </div>
                    )}

                    {/* Canje de Boletos con Puntos */}
                    {!isSnackOnly && (
                      <div className="flex items-center justify-between p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                        <div>
                          <p className="text-xs font-bold text-blue-400">Canjear entradas con puntos</p>
                          <p className="text-2xs text-slate-400">Costo: 100 pts por entrada (Requerido: {selectedSeats.length * 100} pts).</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={usePointsForTickets}
                            onChange={(e) => {
                              setUsePointsForTickets(e.target.checked);
                              if (e.target.checked) setUsePremiumTickets(false);
                            }}
                            disabled={usePremiumTickets || userProfile.points < (selectedSeats.length * 100)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-350 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500 peer-checked:after:bg-slate-950" />
                        </label>
                      </div>
                    )}

                    {/* Canje de Snacks con Puntos */}
                    {selectedSnacks.length > 0 && (
                      <div className="border-t border-slate-850 pt-4 space-y-3">
                        <p className="text-xs font-bold text-white">Canjear Snacks con Puntos</p>
                        <div className="space-y-2">
                          {selectedSnacks.map(snack => {
                            const ptsCost = getPointsForSnack(snack.id);
                            const redeemedQty = redeemedSnacks.filter(id => id === snack.id).length;
                            
                            const handleAddRedeem = () => {
                              if (redeemedQty >= snack.quantity) return;
                              if (userProfile.points < (totalPointsNeeded + ptsCost)) {
                                return toastError('Puntos insuficientes para realizar el canje.');
                              }
                              setRedeemedSnacks(prev => [...prev, snack.id]);
                            };

                            const handleRemoveRedeem = () => {
                              if (redeemedQty === 0) return;
                              setRedeemedSnacks(prev => {
                                const idx = prev.indexOf(snack.id);
                                if (idx > -1) {
                                  const next = [...prev];
                                  next.splice(idx, 1);
                                  return next;
                                }
                                return prev;
                              });
                            };

                            return (
                              <div key={snack.id} className="flex items-center justify-between text-xs p-2.5 bg-slate-900/60 border border-slate-850 rounded-xl">
                                <div>
                                  <p className="font-semibold text-slate-200">{snack.name}</p>
                                  <p className="text-3xs text-slate-500">{ptsCost} pts por unidad (En carrito: {snack.quantity})</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={handleRemoveRedeem}
                                    disabled={redeemedQty === 0}
                                    className="p-1 hover:bg-slate-800 rounded text-slate-450 disabled:opacity-30 border border-slate-800 transition-colors cursor-pointer"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="text-white font-mono font-bold w-6 text-center">{redeemedQty}</span>
                                  <button
                                    type="button"
                                    onClick={handleAddRedeem}
                                    disabled={redeemedQty >= snack.quantity || userProfile.points < (totalPointsNeeded + ptsCost)}
                                    className="p-1 hover:bg-slate-800 rounded text-slate-450 disabled:opacity-30 border border-slate-800 transition-colors cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {totalPointsNeeded > 0 && (
                      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-850 text-right">
                        <span className="text-3xs text-slate-500 font-extrabold uppercase tracking-wider">Total Puntos Requeridos:</span>
                        <p className="text-sm font-black text-brand-gold font-mono">{totalPointsNeeded} pts</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── Cupones de Crédito ─── */}
              <div className="mb-8 border-b border-slate-800 pb-8">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span>🎟️</span> ¿Tienes un cupón de crédito?
                </h3>
                
                {/* Cupones sugeridos/disponibles (UX mejorada de un clic) */}
                {coupons.length > 0 && !appliedCoupon && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 mb-2 font-semibold">Tus cupones disponibles (Haz clic para aplicar):</p>
                    <div className="flex flex-wrap gap-2">
                      {coupons.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleApplyCoupon(c.code)}
                          className="bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs px-3.5 py-2 rounded-xl border border-slate-700/60 transition-colors flex items-center gap-1.5 animate-keypress cursor-pointer"
                        >
                          <span className="font-mono text-white">{c.code}</span>
                          <span className="font-bold text-emerald-400">(Bs. {parseFloat(c.value).toFixed(2)})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {appliedCoupon ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">✅</span>
                      <div>
                        <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Cupón Aplicado</p>
                        <p className="text-sm font-semibold text-white font-mono">{appliedCoupon.code} (-Bs. {couponDiscount.toFixed(2)})</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-red-400 hover:text-red-300 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Ingresa el código CS-XXXXXX"
                      value={couponCodeInput}
                      onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                      className="flex-1 px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyCoupon(couponCodeInput)}
                      disabled={couponLoading || !couponCodeInput}
                      className="px-6 py-3 bg-brand-primary hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center animate-keypress cursor-pointer"
                    >
                      {couponLoading ? 'Validando...' : 'Aplicar'}
                    </button>
                  </div>
                )}
              </div>

              {netTotalPrice === 0 ? (
                /* ─── Compra cubierta al 100% por cupón ─── */
                <div className="text-center py-6 animate-fade-in">
                  <div className="text-5xl mb-4">🎁</div>
                  <h2 className="text-xl font-bold text-white mb-2">¡Total Cubierto!</h2>
                  <p className="text-slate-400 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
                    Tus beneficios o cupón cubren la totalidad de tu pedido. No es necesario ingresar tarjeta de crédito ni generar QR de pago.
                  </p>
                  <form onSubmit={handleCheckout} className="max-w-md mx-auto">
                    <button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] text-lg flex items-center justify-center animate-keypress cursor-pointer"
                    >
                      <span>✔️</span> Confirmar Compra (Bs. 0.00)
                    </button>
                  </form>
                </div>
              ) : (
                /* ─── Flujo de Pago Tradicional (Tarjeta / QR) ─── */
                <>
                  <h2 className="text-2xl font-bold text-white mb-6">Método de Pago</h2>

                  {/* Payment method tabs */}
                  <div className="flex bg-slate-800 rounded-xl p-1 mb-8">
                    <button
                      type="button"
                      className={`flex-1 flex items-center justify-center py-3 rounded-lg font-medium transition-colors ${
                        paymentMethod === 'card'
                          ? 'bg-brand-primary text-white shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                      }`}
                      onClick={() => setPaymentMethod('card')}
                      disabled={!!qrPaymentData}
                    >
                      <span className="mr-2">💳</span>
                      Tarjeta
                    </button>
                    <button
                      type="button"
                      className={`flex-1 flex items-center justify-center py-3 rounded-lg font-medium transition-colors ${
                        paymentMethod === 'QR'
                          ? 'bg-brand-primary text-white shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                      }`}
                      onClick={() => setPaymentMethod('QR')}
                      disabled={!!qrPaymentData}
                    >
                      <span className="mr-2">📱</span>
                      QR Simple
                    </button>
                  </div>

                  {/* ─── QR Voucher View ─── */}
                  {qrPaymentData && (
                    <div className="flex flex-col items-center animate-fade-in py-4">
                      <div className="bg-red-500/10 text-red-400 font-bold px-6 py-2 rounded-full mb-4 border border-red-500/20">
                        Expira en: {formatTime(timeLeft)}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Paga con tu Banca Móvil</h3>
                      <p className="text-slate-400 mb-6 text-center max-w-sm">
                        Guarda el voucher y escanéalo o súbelo desde la galería de tu aplicación bancaria.
                      </p>

                      {/* Voucher card (captured by html2canvas) */}
                      {qrPaymentData.paymentQrBase64 ? (
                        <div
                          ref={qrVoucherRef}
                          className="bg-white p-8 rounded-3xl shadow-2xl mb-6 flex flex-col items-center border-b-8 border-brand-primary"
                        >
                          <h4 className="text-2xl font-black text-slate-800 mb-1 tracking-tight">CineStream</h4>
                          <p className="text-slate-500 font-medium mb-6 uppercase text-sm tracking-widest">Reserva de Boletos</p>
                          <div className="bg-slate-50 p-2 rounded-2xl mb-6 shadow-inner border border-slate-100">
                            <img
                              src={qrPaymentData.paymentQrBase64}
                              alt="QR de Pago"
                              className="w-56 h-56 object-contain"
                            />
                          </div>
                          <div className="text-center w-full">
                            <p className="text-slate-400 text-xs uppercase mb-1">Monto a Pagar</p>
                            <div className="text-4xl font-black text-red-600 mb-2">Bs. {netTotalPrice.toFixed(2)}</div>
                            <hr className="border-dashed border-slate-300 my-4" />
                            <p className="text-xs text-slate-400 font-mono break-all">ID: {qrPaymentData.transactionId}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12">
                          <svg className="animate-spin h-10 w-10 text-brand-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <p className="text-slate-400">Generando imagen segura...</p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-col sm:flex-row w-full gap-4 max-w-md">
                        <button
                          type="button"
                          onClick={downloadVoucher}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-md flex items-center justify-center border border-slate-700 animate-keypress"
                        >
                          <span className="mr-2 text-xl">💾</span>
                          Guardar Voucher
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmQrPayment}
                          disabled={isConfirming}
                          className="flex-1 bg-brand-primary hover:bg-blue-600 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center disabled:opacity-50 animate-keypress"
                        >
                          {isConfirming ? (
                            <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <span className="mr-2">✔️</span>
                          )}
                          Ya realicé el pago
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ─── Card Form ─── */}
                  {!qrPaymentData && paymentMethod === 'card' && (
                    <form key="card-form" onSubmit={handleCheckout}>
                      <div className="bg-blue-500/10 border border-blue-500/30 text-blue-300 p-4 rounded-xl mb-8 flex items-start">
                        <span className="mr-3 mt-0.5 flex-shrink-0">ℹ️</span>
                        <div className="text-sm">
                          <p className="mb-2"><strong>Simulador de Pagos Activo:</strong> Usa cualquier número de 16 dígitos.</p>
                          <ul className="list-disc pl-5 space-y-1 text-xs text-blue-400">
                            <li>Terminación <strong>0000</strong>: Tarjeta Rechazada (402).</li>
                            <li>Terminación <strong>9999</strong>: Timeout de Pasarela (504).</li>
                          </ul>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-2">Número de Tarjeta</label>
                          <input
                            type="text"
                            required
                            maxLength="19"
                            placeholder="0000 0000 0000 0000"
                            value={cardNumber}
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, '');
                              val = val.replace(/(\d{4})/g, '$1 ').trim();
                              setCardNumber(val);
                            }}
                            className="block w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                          />
                        </div>
                        <div className="flex space-x-6">
                          <div className="w-1/2">
                            <label className="block text-sm font-medium text-slate-400 mb-2">Vencimiento</label>
                            <input
                              type="text"
                              required
                              maxLength="5"
                              placeholder="MM/YY"
                              value={expiry}
                              onChange={(e) => {
                                  let val = e.target.value.replace(/\D/g, '');
                                  if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2, 4);
                                  setExpiry(val);
                              }}
                              className="block w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary text-center"
                            />
                          </div>
                          <div className="w-1/2">
                            <label className="block text-sm font-medium text-slate-400 mb-2">CVC</label>
                            <input
                              type="text"
                              required
                              maxLength="4"
                              placeholder="123"
                              value={cvc}
                              onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))}
                              className="block w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary text-center"
                            />
                          </div>
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full mt-10 bg-brand-primary hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:shadow-[0_0_25px_rgba(225,29,72,0.5)] flex items-center justify-center text-lg animate-keypress"
                      >
                        <span className="mr-2">🔒</span>
                        Pagar Bs. {netTotalPrice.toFixed(2)}
                      </button>
                      <p className="text-center text-slate-500 text-xs mt-4">Pagos procesados de forma segura con encriptación AES-256.</p>
                    </form>
                  )}

                  {/* ─── QR Generate Form ─── */}
                  {!qrPaymentData && paymentMethod === 'QR' && (
                    <form key="qr-form" onSubmit={handleCheckout} className="flex flex-col items-center justify-center py-8">
                      <svg className="w-24 h-24 text-slate-600 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      <p className="text-center text-slate-300 mb-8 max-w-md">
                        Al generar el código QR, tus asientos quedarán reservados. Escanea el código desde tu aplicación bancaria para completar el pago.
                      </p>
                      <button
                        type="submit"
                        className="w-full max-w-md bg-brand-primary hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:shadow-[0_0_25px_rgba(225,29,72,0.5)] flex items-center justify-center text-lg animate-keypress"
                      >
                        <span className="mr-2">📱</span>
                        Generar QR de Cobro (Bs. {netTotalPrice.toFixed(2)})
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>

        </div>
      </ErrorBoundary>
      </div>
    </div>
  );
}
