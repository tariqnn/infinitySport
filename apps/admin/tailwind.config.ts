import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          white: '#FFFFFF',
          offwhite: '#F6F8FB',
          gray: '#E2E8F0',
          charcoal: '#0f172a',
          blue: '#003DA5',
          blueBright: '#141AFF',
          teal: '#4DD4C4',
          lightblue: '#6BA5E8',
          green: '#60D066',
          greenDark: '#1A4D3A'
        }
      },
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-sans)']
      },
      borderRadius: {
        '3xl': '1.25rem',
        'card': '1rem'
      },
      boxShadow: {
        aurora: '0 8px 24px rgba(0, 61, 165, 0.08)',
        panel: '0 4px 20px rgba(0, 61, 165, 0.06)',
        'card-hover': '0 8px 30px rgba(0, 61, 165, 0.1)'
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, rgba(20,26,255,0.06), rgba(107,165,232,0.05), rgba(96,208,102,0.06))'
      }
    }
  },
  plugins: [forms, typography]
};

export default config;

