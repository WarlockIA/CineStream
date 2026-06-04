/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          void:     '#070B14',
          dark:     '#0F172A',
          surface:  '#111827',
          elevated: '#1E2A3B',
          primary: {
            DEFAULT: '#3B82F6',
            hover:   '#2563EB',
          },
          secondary: '#2563EB',
          accent: {
            DEFAULT: '#7C3AED',
            hover:   '#6D28D9',
          },
          gold: {
            DEFAULT: '#F59E0B',
            light:   '#FBBF24',
          },
          success:  '#10B981',
          danger:   '#EF4444',
          warning:  '#F59E0B',
        },
      },
      fontFamily: {
        sans:    ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'Outfit', 'sans-serif'],
        mono:    ['"Fira Code"', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
      animation: {
        'fade-in':     'fadeIn 0.4s ease-out both',
        'slide-up':    'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-down':  'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'bounce-slow': 'bounceSlow 2.5s ease-in-out infinite',
        'shimmer':     'shimmer 2s linear infinite',
        'pulse-glow':  'pulseGlow 2.5s ease-in-out infinite',
        'float':       'float 3s ease-in-out infinite',
        'spin-slow':   'spin 3s linear infinite',
        'scale-in':    'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scan-line':   'scanLine 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        bounceSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(59,130,246,0)' },
          '50%':      { boxShadow: '0 0 24px 6px rgba(59,130,246,0.35)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        scanLine: {
          '0%':   { top: '5%',  opacity: '1' },
          '50%':  { top: '95%', opacity: '0.7' },
          '100%': { top: '5%',  opacity: '1' },
        },
      },
      backgroundImage: {
        'cinema-gradient':  'linear-gradient(135deg, #1D4ED8 0%, #7C3AED 50%, #DB2777 100%)',
        'blue-gradient':    'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
        'surface-gradient': 'linear-gradient(180deg, #111827 0%, #0F172A 100%)',
        'card-shine':       'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%)',
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow-blue':   '0 0 24px rgba(59,130,246,0.45)',
        'glow-purple': '0 0 24px rgba(124,58,237,0.45)',
        'glow-gold':   '0 0 24px rgba(245,158,11,0.45)',
        'glow-green':  '0 0 24px rgba(16,185,129,0.45)',
        'card':        '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover':  '0 8px 48px rgba(0,0,0,0.65)',
        'inner-glow':  'inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [],
}
