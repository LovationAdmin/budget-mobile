/** @type {import('tailwindcss').Config} */
// Aligned with budget-ui (web) HSL tokens.
// Primary blue + warm coral CTA, light + dark, radius 1rem.
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'hsl(200, 75%, 50%)',
          foreground: '#FFFFFF',
          50:  '#EAF6FD',
          100: '#CFEAF9',
          200: '#9FD5F3',
          300: '#6FC0EC',
          400: '#3FAAE6',
          500: '#2096DB',
          600: '#1879B0',
          700: '#125B85',
          800: '#0C3D5A',
          900: '#061F2D',
        },
        secondary: {
          DEFAULT: 'hsl(172, 50%, 50%)',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: 'hsl(260, 60%, 95%)',
          foreground: 'hsl(260, 60%, 25%)',
        },
        warm: {
          DEFAULT: '#F97316',
          50: '#FFF7ED', 100: '#FFEDD5', 200: '#FED7AA',
          300: '#FDBA74', 400: '#FB923C', 500: '#F97316',
          600: '#EA580C', 700: '#C2410C',
        },
        success: 'hsl(152, 60%, 45%)',
        warning: 'hsl(38, 92%, 55%)',
        danger:  'hsl(0, 72%, 55%)',

        background: '#FFFFFF',
        foreground: '#0F172A',
        card:       '#FFFFFF',
        'card-fg':  '#0F172A',
        muted:      '#F1F5F9',
        'muted-fg': '#64748B',
        border:     '#E2E8F0',
        input:      '#E2E8F0',
        ring:       'hsl(200, 75%, 50%)',

        'background-dark': '#0F172A',
        'foreground-dark': '#F8FAFC',
        'card-dark':       '#1E293B',
        'card-fg-dark':    '#F8FAFC',
        'muted-dark':      '#1E293B',
        'muted-fg-dark':   '#94A3B8',
        'border-dark':     '#334155',
      },
      fontFamily: {
        sans:     ['DMSans_400Regular'],
        medium:   ['DMSans_500Medium'],
        semibold: ['DMSans_600SemiBold'],
        bold:     ['DMSans_700Bold'],
        display:           ['PlusJakartaSans_500Medium'],
        'display-semibold':['PlusJakartaSans_600SemiBold'],
        'display-bold':    ['PlusJakartaSans_700Bold'],
        'display-extra':   ['PlusJakartaSans_800ExtraBold'],
      },
      borderRadius: {
        DEFAULT: '1rem',
        lg:      '1.25rem',
        xl:      '1.5rem',
      },
    },
  },
  plugins: [],
};
