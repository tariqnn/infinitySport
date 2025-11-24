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
          gray: '#E4E9F2',
          charcoal: '#1C2437',
          blue: '#1426FF',
          teal: '#24D2C1',
          lightblue: '#69FFDB',
          green: '#61FF45',
          greenDark: '#1C934E'
        }
      },
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-sans)']
      },
      borderRadius: {
        '3xl': '1.75rem'
      },
      boxShadow: {
        aurora: '0 15px 35px rgba(17, 27, 66, 0.12)',
        panel: '0 20px 45px rgba(15, 23, 42, 0.10)'
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(115deg, rgba(20,38,255,0.15), rgba(36,210,193,0.12), rgba(97,255,69,0.12))'
      }
    }
  },
  plugins: [forms, typography]
};

export default config;

