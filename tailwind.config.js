/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cyber-blue': '#00D4FF',
        'deep-navy': '#0A1628',
        'electric-gold': '#FFB800',
        'neon-purple': '#B026FF',
      },
      fontFamily: {
        'display': ['Orbitron', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'circuit': "url('/circuit-pattern.svg')",
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}