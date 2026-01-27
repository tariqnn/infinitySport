/**
 * Infinity Sports Premium Brand System
 * Converted from CMYK to HEX - Premium Global Sports Brand Design
 */

export const brandColors = {
  black: '#000000',
  
  // Blue Palette
  bluePrimary: '#141AFF', // CMYK(92, 85, 0, 0) - Deep blue
  lightBlue: '#6BA5E8', // CMYK(59, 0, 14, 0) - Light blue/teal
  
  // Green Palette
  greenPrimary: '#60D066', // CMYK(62, 0, 73, 0) - Bright green
  greenDark: '#1A4D3A', // CMYK(87, 32, 64, 15) - Dark green
  
  // Derived colors
  blueLight: '#4A7FFF',
  blueDark: '#0A1F8C',
  greenLight: '#7FE885',
  teal: '#4DD4C4', // Blend between blue and green
} as const;

export const gradients = {
  // Main logo gradient: BLUE → TEAL → GREEN (Cinematic)
  primary: `linear-gradient(135deg, ${brandColors.bluePrimary} 0%, ${brandColors.lightBlue} 50%, ${brandColors.greenPrimary} 100%)`,
  primaryVertical: `linear-gradient(180deg, ${brandColors.bluePrimary} 0%, ${brandColors.lightBlue} 50%, ${brandColors.greenPrimary} 100%)`,
  primaryHorizontal: `linear-gradient(90deg, ${brandColors.bluePrimary} 0%, ${brandColors.lightBlue} 50%, ${brandColors.greenPrimary} 100%)`,
  
  // Premium button gradients
  buttonPrimary: `linear-gradient(135deg, ${brandColors.bluePrimary} 0%, ${brandColors.greenPrimary} 100%)`,
  buttonPrimaryHover: `linear-gradient(135deg, ${brandColors.blueLight} 0%, ${brandColors.greenLight} 100%)`,
  
  // Cinematic hero overlays
  heroOverlay: `linear-gradient(135deg, ${brandColors.bluePrimary}40 0%, ${brandColors.lightBlue}30 50%, ${brandColors.greenPrimary}40 100%)`,
  heroOverlayDark: `linear-gradient(135deg, ${brandColors.blueDark}60 0%, ${brandColors.greenDark}60 100%)`,
  heroOverlayLight: `linear-gradient(135deg, ${brandColors.bluePrimary}20 0%, ${brandColors.greenPrimary}20 100%)`,
  
  // Premium card accents
  cardBorder: `linear-gradient(90deg, ${brandColors.lightBlue} 0%, ${brandColors.teal} 100%)`,
  cardGlow: `linear-gradient(135deg, ${brandColors.bluePrimary}15 0%, ${brandColors.greenPrimary}15 100%)`,
  
  // Section dividers
  divider: `linear-gradient(90deg, transparent 0%, ${brandColors.lightBlue} 50%, transparent 100%)`,
} as const;

export const shadows = {
  // Premium shadows with brand color tints
  card: '0 8px 32px rgba(0, 0, 0, 0.08)',
  cardHover: '0 16px 48px rgba(20, 26, 255, 0.2), 0 0 0 1px rgba(96, 208, 102, 0.1)',
  button: '0 8px 24px rgba(20, 26, 255, 0.35)',
  buttonHover: '0 12px 32px rgba(20, 26, 255, 0.5), 0 0 24px rgba(96, 208, 102, 0.3)',
  navbar: '0 4px 24px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)',
  glow: '0 0 40px rgba(20, 26, 255, 0.3)',
  glowGreen: '0 0 40px rgba(96, 208, 102, 0.3)',
} as const;

export const spacing = {
  xs: '0.5rem',
  sm: '1rem',
  md: '1.5rem',
  lg: '2rem',
  xl: '3rem',
  '2xl': '4rem',
  '3xl': '6rem',
} as const;

export const typography = {
  fontFamily: {
    sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
    display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  sizes: {
    hero: 'clamp(3rem, 8vw, 6rem)',
    h1: 'clamp(2.5rem, 6vw, 4.5rem)',
    h2: 'clamp(2rem, 5vw, 3.5rem)',
    h3: 'clamp(1.5rem, 4vw, 2.5rem)',
    h4: 'clamp(1.25rem, 3vw, 2rem)',
  },
} as const;

export const borderRadius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  full: '9999px',
} as const;

// Premium Animation Presets
export const animations = {
  duration: {
    fast: '200ms',
    normal: '300ms',
    slow: '500ms',
    slower: '700ms',
  },
  easing: {
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    elastic: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
  },
  transitions: {
    default: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    smooth: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'all 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

