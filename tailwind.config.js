/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          900: '#312e81',
        },
        success: '#10b981',
        danger:  '#ef4444',
        warning: '#f59e0b',
        surface: '#ffffff',
        muted:   '#64748b',
        border:  '#e2e8f0',
        bg:      '#f8fafc',
      },
      fontFamily: {
        sans:         ['PlusJakartaSans_400Regular'],
        medium:       ['PlusJakartaSans_500Medium'],
        semibold:     ['PlusJakartaSans_600SemiBold'],
        bold:         ['PlusJakartaSans_700Bold'],
        extrabold:    ['PlusJakartaSans_800ExtraBold'],
      },
    },
  },
  plugins: [],
};
