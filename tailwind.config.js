/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#0f172a',
        },
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
      },
      borderRadius: {
        'finlens': '16px',
        'finlens-lg': '20px',
      },
      boxShadow: {
        'finlens': '0 4px 16px rgba(15, 23, 42, 0.06), 0 2px 6px rgba(15, 23, 42, 0.04)',
        'finlens-lg': '0 16px 40px rgba(15, 23, 42, 0.08), 0 6px 12px rgba(15, 23, 42, 0.04)',
      },
      animation: {
        'fade-up': 'fadeUp 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
