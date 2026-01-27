/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#edf8ff',
          100: '#d3eeff',
          200: '#a5ddff',
          300: '#73c6ff',
          400: '#3aa3ff',
          500: '#0d7bff',
          600: '#005fe0',
          700: '#0045aa',
          800: '#00327a',
          900: '#021f4d',
          950: '#010f33'
        },
        secondary: {
          50: '#fef5ff',
          100: '#fae6ff',
          200: '#f1c8ff',
          300: '#e3a0ff',
          400: '#d377ff',
          500: '#c04dff',
          600: '#9c34db',
          700: '#7625aa',
          800: '#561b7a',
          900: '#3b1254',
          950: '#240536'
        },
        accent: '#ffd084',
        midnight: {
          900: '#010c15',
          800: '#041628',
          700: '#082340',
          600: '#0b2f54'
        },
        // Slate colors - manually defined for compatibility
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif']
      },
      boxShadow: {
        card: '0 24px 80px -40px rgba(15, 23, 42, 0.6)',
        glow: '0 0 60px -10px rgba(47, 90, 255, 0.35)'
      },
      borderRadius: {
        xl: '1rem',
        '3xl': '1.75rem'
      }
    }
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
  future: {
    hoverOnlyWhenSupported: true
  }
};

