import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        forge: {
          bg: '#0A0A0A',
          panel: '#141414',
          'panel-light': '#1E1E1E',
          red: '#C8321E',
          'red-dark': '#A02818',
          'red-light': '#E04030',
          gold: '#B8962E',
          'gold-light': '#D4AE40',
          text: '#F0EDE8',
          muted: '#C8C0B0',
          border: '#2A2A2A',
          track: '#1A1A1A',
        },
      },
      fontFamily: {
        bebas: ['var(--font-bebas)', 'sans-serif'],
        inter: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-dm-mono)', 'monospace'],
      },
      backgroundImage: {
        'scan-lines': 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)',
      },
      animation: {
        'pulse-red': 'pulse-red 2s ease-in-out infinite',
        'slide-in': 'slide-in 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      gridTemplateColumns: {
        editor: '260px 1fr 300px',
      },
      gridTemplateRows: {
        editor: '1fr 220px',
      },
    },
  },
  plugins: [],
}

export default config
