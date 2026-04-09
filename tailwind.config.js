/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: {
          900: '#0B1D3A',
          800: '#112649',
          700: '#1A3460',
          600: '#234578',
        },
        accent: '#F97316',
      },
    },
  },
  plugins: [],
}
