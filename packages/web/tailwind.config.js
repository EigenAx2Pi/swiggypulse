/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // App palette — slate base, teal positive, red alert.
        // Swiggy orange is reserved for the "Powered by Swiggy" badge only.
        swiggy: '#FF5200',
        slate: {
          950: '#0a0e14',
          900: '#0f141c',
          850: '#151b25',
          800: '#1c2330',
          750: '#232b3a',
          700: '#2d3648',
          600: '#3f4b62',
          500: '#5a6781',
          400: '#7d8ba8',
          300: '#a3afc7',
          200: '#cdd5e3',
          100: '#e6eaf2',
        },
        teal: {
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
        },
        accent: '#22d3a3',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
