import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        'xs': '480px',
      },
      colors: {
        velvet: {
          black: '#000000',
          dark: '#0a0a0a',
          card: '#111111',
          white: '#FFFFFF',
          muted: '#D4D4D4',
          accent: '#4A7D9C',
          'accent-dim': 'rgba(74, 125, 156, 0.3)',
        },
      },
      fontFamily: {
        heading: ['Cormorant Garamond', 'Georgia', 'serif'],
        body: ['Montserrat', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      letterSpacing: {
        'extra-wide': '0.3em',
        'ultra-wide': '0.4em',
      },
      transitionTimingFunction: {
        'luxury': 'cubic-bezier(0.215, 0.61, 0.355, 1)',
        'luxury-in-out': 'cubic-bezier(0.645, 0.045, 0.355, 1)',
      },
      transitionDuration: {
        'luxury': '600ms',
        'luxury-slow': '1000ms',
      },
      animation: {
        'fade-in': 'fadeIn 1.2s cubic-bezier(0.215, 0.61, 0.355, 1) forwards',
        'fade-in-delay': 'fadeIn 1.2s cubic-bezier(0.215, 0.61, 0.355, 1) 0.3s forwards',
        'fade-in-delay-2': 'fadeIn 1.2s cubic-bezier(0.215, 0.61, 0.355, 1) 0.6s forwards',
        'scroll-pulse': 'scrollPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scrollPulse: {
          '0%, 100%': { opacity: '0.3', transform: 'scaleY(0.8)' },
          '50%': { opacity: '0.8', transform: 'scaleY(1)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
