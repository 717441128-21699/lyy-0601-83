/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'pixel-bg': '#0a0612',
        'pixel-purple': '#1a0a2e',
        'pixel-pink': '#ff2d95',
        'pixel-blue': '#00d4ff',
        'pixel-green': '#39ff14',
        'pixel-yellow': '#ffdd00',
        'pixel-orange': '#ff6b35',
        'pixel-violet': '#9b59b6',
        'pixel-teal': '#1abc9c',
        'pixel-red': '#e74c3c',
      },
      fontFamily: {
        'pixel': ['"Press Start 2P"', 'cursive'],
        'pixel-body': ['VT323', 'monospace'],
      },
      animation: {
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
        'scanline': 'scanline 6s linear infinite',
        'pixel-shake': 'pixel-shake 0.3s ease-in-out',
        'glow': 'glow 1.5s ease-in-out infinite alternate',
        'pixel-pop': 'pixel-pop 0.2s ease-out',
      },
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { boxShadow: '0 0 5px currentColor, 0 0 10px currentColor' },
          '50%': { boxShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor' },
        },
        'scanline': {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 100%' },
        },
        'pixel-shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-2px)' },
          '75%': { transform: 'translateX(2px)' },
        },
        'glow': {
          'from': { textShadow: '0 0 5px currentColor' },
          'to': { textShadow: '0 0 10px currentColor, 0 0 15px currentColor' },
        },
        'pixel-pop': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
