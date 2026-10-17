/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Inter', 'Sora', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        uber: {
          black: '#000000',
          white: '#FFFFFF',
          bg: '#F8F9FA',
          card: '#FFFFFF',
          border: '#E5E7EB',
          text: '#111827',
          muted: '#6B7280',
          accent: '#16A34A',
          'accent-light': '#DCFCE7',
          'accent-dark': '#15803D',
          hover: '#F3F4F6',
          darkBg: '#090A0F',
          darkCard: '#111319',
          darkBorder: '#1F2430',
          darkText: '#F9FAFB',
          darkMuted: '#9CA3AF',
        },
        navy: {
          950: '#070B14',
          900: '#0F172A',
          850: '#152036',
          800: '#1E293B',
          700: '#334155',
        },
        risk: {
          low: '#16A34A',      // Modern Emerald Green
          medium: '#EAB308',   // Amber Yellow
          high: '#F97316',     // Orange
          critical: '#EF4444', // Red
        },
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'card': '0 2px 8px -2px rgba(0, 0, 0, 0.06), 0 1px 4px -1px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 12px 24px -6px rgba(0, 0, 0, 0.08), 0 4px 8px -4px rgba(0, 0, 0, 0.04)',
        'elevated': '0 20px 30px -10px rgba(0, 0, 0, 0.12), 0 8px 12px -6px rgba(0, 0, 0, 0.06)',
        'glow-accent': '0 0 24px -4px rgba(22, 163, 74, 0.25)',
        'glow-danger': '0 0 24px -4px rgba(239, 68, 68, 0.25)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-up': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-up': 'scale-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1440px',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'safe-top': 'env(safe-area-inset-top, 0px)',
      },
    },
  },
  plugins: [],
}
