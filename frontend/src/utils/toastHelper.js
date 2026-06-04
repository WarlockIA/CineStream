import toast from 'react-hot-toast';

// ─── Estilos base del design system Noir Cinéma ───────────────────────────────
const BASE_STYLE = {
  fontFamily: "'Inter', system-ui, sans-serif",
  fontWeight: '500',
  fontSize: '14px',
  borderRadius: '12px',
  padding: '14px 16px',
  maxWidth: '380px',
  backdropFilter: 'blur(12px)',
};

const STYLES = {
  success: {
    ...BASE_STYLE,
    background: 'linear-gradient(135deg, rgba(16,185,129,0.95), rgba(5,150,105,0.95))',
    color: '#fff',
    border: '1px solid rgba(52,211,153,0.3)',
    boxShadow: '0 8px 32px rgba(16,185,129,0.25)',
  },
  error: {
    ...BASE_STYLE,
    background: 'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(185,28,28,0.95))',
    color: '#fff',
    border: '1px solid rgba(252,165,165,0.3)',
    boxShadow: '0 8px 32px rgba(239,68,68,0.25)',
  },
  warning: {
    ...BASE_STYLE,
    background: 'linear-gradient(135deg, rgba(245,158,11,0.95), rgba(180,83,9,0.95))',
    color: '#fff',
    border: '1px solid rgba(252,211,77,0.3)',
    boxShadow: '0 8px 32px rgba(245,158,11,0.25)',
  },
  info: {
    ...BASE_STYLE,
    background: 'linear-gradient(135deg, rgba(59,130,246,0.95), rgba(29,78,216,0.95))',
    color: '#fff',
    border: '1px solid rgba(147,197,253,0.3)',
    boxShadow: '0 8px 32px rgba(59,130,246,0.25)',
  },
  promise: {
    ...BASE_STYLE,
    background: 'rgba(30, 41, 59, 0.98)',
    color: '#e2e8f0',
    border: '1px solid rgba(71, 85, 105, 0.6)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
};

// ─── Toast de Éxito ────────────────────────────────────────────────────────────
export const toastSuccess = (message) => {
  toast.success(message, {
    style: STYLES.success,
    iconTheme: { primary: '#fff', secondary: 'rgba(16,185,129,0.8)' },
    duration: 3500,
  });
};

// ─── Toast de Error ────────────────────────────────────────────────────────────
export const toastError = (message) => {
  toast.error(message, {
    style: STYLES.error,
    iconTheme: { primary: '#fff', secondary: 'rgba(239,68,68,0.8)' },
    duration: 4500,
  });
};

// ─── Toast de Advertencia ──────────────────────────────────────────────────────
export const toastWarning = (message) => {
  toast(message, {
    icon: '⚠️',
    style: STYLES.warning,
    duration: 4000,
  });
};

// ─── Toast Informativo ─────────────────────────────────────────────────────────
export const toastInfo = (message) => {
  toast(message, {
    icon: 'ℹ️',
    style: STYLES.info,
    duration: 3500,
  });
};

// ─── Toast de Asiento Ocupado (caso especial) ──────────────────────────────────
export const toastSeatOccupied = (seatNumber) => {
  toast.error(`El asiento ${seatNumber} ya está ocupado o bloqueado.`, {
    style: STYLES.error,
    icon: '🪑',
    iconTheme: { primary: '#fff', secondary: 'rgba(239,68,68,0.8)' },
    duration: 3500,
  });
};

// ─── Toast de Compra Confirmada (caso especial) ────────────────────────────────
export const toastPurchaseConfirmed = (movieTitle) => {
  toast.success(`¡Compra confirmada! Disfruta "${movieTitle}" 🎬`, {
    style: STYLES.success,
    iconTheme: { primary: '#fff', secondary: 'rgba(16,185,129,0.8)' },
    duration: 5000,
  });
};

// ─── Toast de Promesa (procesando pago, carga async, etc.) ────────────────────
// Acepta strings o funciones para los mensajes de success/error
export const toastPromise = (promise, messages = {}) => {
  const {
    loading = 'Procesando...',
    success = '¡Operación exitosa!',
    error = 'Ocurrió un error.',
  } = messages;

  return toast.promise(
    promise,
    { loading, success, error },
    {
      style: STYLES.promise,
      loading: { iconTheme: { primary: '#3B82F6', secondary: 'rgba(59,130,246,0.2)' } },
      success: { style: STYLES.success, iconTheme: { primary: '#fff', secondary: 'rgba(16,185,129,0.8)' } },
      error:   { style: STYLES.error,   iconTheme: { primary: '#fff', secondary: 'rgba(239,68,68,0.8)'  } },
    }
  );
};
