// Design-Tokens (aus den Figma-Foundations). Screens nutzen nur diese Werte – nichts hartkodieren.
import { TIER_COLORS } from '../lib/ranking';

export const colors = {
  bg: '#0B0D12',
  surface: '#151821',
  surface2: '#1E2230',
  border: '#2A2F3F',
  text: '#FFFFFF',
  textSecondary: '#A4A9B8',
  textTertiary: '#6B7083',
  primary: '#6C5CFF',
  accent: '#00E0B8',
  danger: '#FF4D6D',
  warning: '#FFB020',
  success: '#2BD67B',
  tiers: TIER_COLORS,
  /** 10 Liga-Stufen: Eisen … Titan */
  leagues: ['#7A7F8C', '#B8733D', '#C9D1DC', '#F5C451', '#4FD1C5', '#2BD67B', '#5AB8FF', '#B05CFF', '#E05CFF', '#FF4D6D'],
} as const;

export const gradients = {
  primary: ['#6C5CFF', '#B05CFF'] as const,
  streak: ['#FF7A18', '#FFB020'] as const,
};

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 14: 56 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 } as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const type = {
  display: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 40 },
  h1: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34 },
  h2: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28 },
  h3: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.66, textTransform: 'uppercase' as const },
} as const;

export type TypeVariant = keyof typeof type;

export const shadow = {
  card: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  glow: (color: string) => ({ shadowColor: color, shadowOpacity: 0.6, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 8 }),
};

export const theme = { colors, gradients, space, radius, fonts, type, shadow };
