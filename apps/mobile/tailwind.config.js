/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        accent: '#F2C94C',
        charcoal: '#15171A',
        mist: '#F6F8F6',
        primary: '#0E7C7B',
        secondary: '#241F3A',
      },
      fontFamily: {
        body: ['Inter_400Regular'],
        heading: ['Poppins_700Bold'],
      },
    },
  },
  plugins: [],
};
