/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#E84822',
        'primary-dark': '#c03010',
        'primary-light': '#FF5533',
        success: '#1DB954',
        gold: '#F0A500',
        'bg-base': '#08090C',
        'bg-2': '#10131A',
        'bg-3': '#181D28',
        'bg-4': '#1F2535',
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        dm: ['"DM Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
