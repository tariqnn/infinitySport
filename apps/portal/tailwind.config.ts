import type { Config } from 'tailwindcss';
import sharedPreset from '../../packages/config/tailwind.preset.cjs';

const config: Config = {
  presets: [sharedPreset as Config],
  content: ['./pages/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Infinity Sport Brand Colors
        brand: {
          primaryBlue: '#1D48FF',
          primaryGreen: '#29C461',
          tealAccent: '#00A3A3',
          darkNavy: '#071427',
        },
        ui: {
          softBg: '#F4F6FA',
          cardBg: '#FFFFFF',
          border: '#E1E5EF',
          textPrimary: '#0F172A',
          textMuted: '#6B7280',
          danger: '#EF4444',
          warning: '#F97316',
          success: '#22C55E',
        },
        // Legacy portal colors (for backward compatibility during transition)
        portal: {
          black: '#000000',
          blue: '#1D48FF',
          lightblue: '#69FFDB',
          green: '#29C461',
          greenDark: '#1C934E',
          gray100: '#F4F6FA',
          gray200: '#E8EEF6',
          gray300: '#D6E0EE',
          gray900: '#0F172A'
        }
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(90deg, #1D48FF, #29C461)',
        'alt-gradient': 'linear-gradient(135deg, #1D48FF, #00A3A3)',
      },
      boxShadow: {
        'portal-card': '0 10px 25px rgba(15, 23, 42, 0.06)',
        'portal-card-hover': '0 18px 45px rgba(15, 23, 42, 0.12)',
        'brand-glow': '0 8px 32px rgba(29, 72, 255, 0.25)',
      },
      borderRadius: {
        'portal-card': '16px',
        'portal-button': '12px',
      }
    }
  }
};

export default config;
