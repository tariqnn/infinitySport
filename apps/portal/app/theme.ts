export const brandColors = {
  black: '#000000',
  bluePrimary: '#1426FF',
  lightBlue: '#69FFDB',
  greenPrimary: '#61FF45',
  greenDark: '#1C934E',
  gray900: '#0F1A2B',
  gray800: '#162238',
  gray700: '#1F2D44',
  gray500: '#5C6475',
  gray300: '#D6E0EE',
  gray200: '#E8EEF6',
  gray100: '#F5F7FB',
  white: '#FFFFFF'
};

export const gradients = {
  primary: `linear-gradient(110deg, ${brandColors.bluePrimary} 0%, ${brandColors.lightBlue} 50%, ${brandColors.greenPrimary} 100%)`,
  subtle: `linear-gradient(140deg, rgba(20,38,255,0.08), rgba(105,255,219,0.08))`,
  glow: `linear-gradient(120deg, rgba(20,38,255,0.2), rgba(97,255,69,0.2))`,
  cardBorder: `linear-gradient(145deg, rgba(20,38,255,0.25), rgba(105,255,219,0.25), rgba(97,255,69,0.25))`
};

export const shadows = {
  card: '0 12px 30px rgba(15, 23, 42, 0.08)',
  cardHover: '0 22px 55px rgba(15, 23, 42, 0.16)',
  nav: '0 10px 30px rgba(15, 23, 42, 0.08)',
  glow: '0 0 35px rgba(20, 38, 255, 0.25)'
};

export const radii = {
  card: '20px',
  panel: '24px',
  pill: '999px'
};

export const spacing = {
  base: 8,
  section: 32
};

export const typography = {
  heading: 'clamp(24px, 2vw, 38px)',
  subheading: 'clamp(16px, 1.3vw, 20px)'
};

