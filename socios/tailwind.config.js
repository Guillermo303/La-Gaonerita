/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#FDF1EC', 100: '#F8DCD2', 200: '#F2B9A6', 300: '#E48C70', 400: '#CF6246', 500: '#BD4A26', 600: '#A03A1A', 700: '#682B14', 800: '#4A200F', 900: '#33160A' },
        ink: { 50: '#F4EFE6', 100: '#E8DECF', 200: '#D0C2AC', 300: '#B09E83', 400: '#8A7155', 500: '#665949', 600: '#4A3F33', 700: '#35302A', 800: '#282621', 900: '#1D1A13', 950: '#110F0A' },
        cream: { 50: '#FFF8F2', 100: '#F7ECDC', 200: '#EDE1D1', 300: '#DFC0B7' }
      },
      fontFamily: {
        sans: ['"Work Sans"', '"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Anton', 'Bitter', 'Georgia', 'serif']
      },
      boxShadow: {
        block: '4px 4px 0 0 #665949',
        blockSm: '3px 3px 0 0 #665949',
        blockBrand: '4px 4px 0 0 #BD4A26'
      }
    }
  },
  plugins: []
};
