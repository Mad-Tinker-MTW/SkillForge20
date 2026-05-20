/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['Courier New', 'Courier', 'monospace'],
      },
      colors: {
        amber: {
          bg: '#FAEEDA',
          dark: '#633806',
          mid: '#EF9F27',
        },
        teal: {
          bg: '#E1F5EE',
          dark: '#085041',
          mid: '#1D9E75',
        },
        coral: {
          bg: '#FAECE7',
          dark: '#4A1B0C',
          mid: '#D85A30',
        },
        blue: {
          bg: '#E6F1FB',
          dark: '#042C53',
          mid: '#378ADD',
        },
        purple: {
          bg: '#EEEDFE',
          dark: '#26215C',
          mid: '#7F77DD',
        },
      },
    },
  },
  plugins: [],
}
