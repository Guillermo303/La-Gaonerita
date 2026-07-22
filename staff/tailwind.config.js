/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#FDF1EE', 100: '#FADCD5', 200: '#F4B7A8', 300: '#EC8D75', 400: '#E2603F', 500: '#D6431F', 600: '#B8371A', 700: '#962D18', 800: '#772517', 900: '#4E1810' },
        ink: { 50: '#F6F1EA', 100: '#E9DFD2', 200: '#CDBCA6', 300: '#A8927A', 400: '#7C6A56', 500: '#5A4B3C', 600: '#42362B', 700: '#31271E', 800: '#251C14', 900: '#1B130C', 950: '#140D08' },
        cream: { 50: '#FBF7EF', 100: '#F5EDDF', 200: '#EADFCA', 300: '#DECCAD' }
      },
      fontFamily: {
        sans: ['"Work Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Bitter', 'Georgia', 'serif']
      }
    }
  },
  plugins: []
};
