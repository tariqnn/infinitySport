import type { Config } from 'tailwindcss';
import sharedPreset from '../../packages/config/tailwind.preset.cjs';
import { brandColors } from './app/theme';

const config: Config = {
  presets: [sharedPreset as Config],
  content: ['./pages/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './app/**/*.{js,ts,jsx,tsx,mdx}'],
  safelist: [
    // Booking duration buttons – ensure visible in production (Tailwind purge)
    { pattern: /^(rounded-xl|border-2|px-4|py-2\.5|text-sm|font-medium|transition-all|border-brand-blue-primary|bg-brand-blue-primary|text-white|border-gray-200|text-brand-black)/ },
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        brand: {
          black: brandColors.black,
          blue: {
            primary: brandColors.bluePrimary,
            light: brandColors.blueLight,
            dark: brandColors.blueDark,
          },
          lightBlue: brandColors.lightBlue,
          green: {
            primary: brandColors.greenPrimary,
            light: brandColors.greenLight,
            dark: brandColors.greenDark,
          },
          teal: brandColors.teal,
        }
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #141AFF 0%, #6BA5E8 50%, #60D066 100%)',
        'gradient-primary-vertical': 'linear-gradient(180deg, #141AFF 0%, #6BA5E8 50%, #60D066 100%)',
        'gradient-primary-horizontal': 'linear-gradient(90deg, #141AFF 0%, #6BA5E8 50%, #60D066 100%)',
        'gradient-button': 'linear-gradient(135deg, #141AFF 0%, #60D066 100%)',
        'gradient-hero': 'linear-gradient(135deg, rgba(20, 26, 255, 0.4) 0%, rgba(107, 165, 232, 0.3) 50%, rgba(96, 208, 102, 0.4) 100%)',
        'gradient-radial': 'radial-gradient(circle, transparent 0%, rgba(0, 0, 0, 0.3) 100%)',
      },
      boxShadow: {
        'card': '0 8px 32px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 16px 48px rgba(20, 26, 255, 0.2), 0 0 0 1px rgba(96, 208, 102, 0.1)',
        'button': '0 8px 24px rgba(20, 26, 255, 0.35)',
        'button-hover': '0 12px 32px rgba(20, 26, 255, 0.5), 0 0 24px rgba(96, 208, 102, 0.3)',
        'glow': '0 0 40px rgba(20, 26, 255, 0.3)',
        'glow-green': '0 0 40px rgba(96, 208, 102, 0.3)',
      },
      borderRadius: {
        'card': '16px',
      }
    }
  }
};

export default config;
