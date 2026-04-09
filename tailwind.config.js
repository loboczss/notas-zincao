/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './app/components/**/*.{vue,js,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/app.vue',
    './app/error.vue',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fffdf2',
          100: '#fff9d4',
          200: '#fff4a3',
          300: '#feef72',
          400: '#fee941',
          500: '#fec714',
          600: '#e5b110',
          700: '#b28b0d',
          800: '#7f6309',
          900: '#4c3b05',
        },
      },
      backgroundImage: {
        'mesh-light': 'linear-gradient(-45deg, rgba(254, 199, 20, 0.18), rgba(229, 177, 16, 0.16), rgba(254, 233, 65, 0.12), rgba(254, 199, 20, 0.1))',
        'mesh-dark': 'linear-gradient(-45deg, rgba(178, 139, 13, 0.45), rgba(127, 99, 9, 0.35), rgba(112, 87, 8, 0.4), rgba(76, 59, 5, 0.32))',
      },
      keyframes: {
        mesh: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        mesh: 'mesh 15s ease infinite',
        'fade-in': 'fadeIn 0.4s ease forwards',
        'fade-in-up': 'fadeInUp 0.5s ease forwards',
      }
    },
  },
  plugins: [],
}

