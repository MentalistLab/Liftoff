// Design-Tokens (aus den Figma-Foundations). Screens nutzen nur diese Werte – nichts hartkodieren.
import { TIER_COLORS } from '../lib/ranking';

export const colors = {
  // Eisblau & Graphit (Redesign) – Rang-Farben bleiben unverändert
  bg: '#0E1116',
  surface: '#161B22',
  surface2: '#1F2630',
  border: '#2B3440',
  text: '#F2F5F8',
  textSecondary: '#9AA6B2',
  textTertiary: '#7D8996',
  primary: '#5CC8FF',
  /** Text/Icons auf Eisblau-Flächen */
  onPrimary: '#0B1520',
  /** zarte Eisblau-Tönung für ausgewählte Flächen */
  primarySoft: '#12202C',
  primaryLine: '#23465E',
  accent: '#8FD8FF',
  frost: '#BDEBFF',
  streak: '#FF8A3D',
  streakSoft: '#2A1A10',
  danger: '#FF5C6C',
  warning: '#FFB547',
  success: '#3DDC97',
  successSoft: '#12261F',
  tiers: TIER_COLORS,
  /** 10 Liga-Stufen: Eisen … Titan */
  leagues: ['#7A7F8C', '#B8733D', '#C9D1DC', '#F5C451', '#4FD1C5', '#2BD67B', '#5AB8FF', '#B05CFF', '#E05CFF', '#FF4D6D'],
} as const;

export const gradients = {
  primary: ['#7FD8FF', '#3A9EFF'] as const,
  streak: ['#FF7A18', '#FFB020'] as const,
};

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 14: 56 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 } as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  /** Anzeigetafel-Schrift für Zahlen, Ränge und Überschriften */
  display: 'BarlowSemiCondensed_800ExtraBold',
  displayBold: 'BarlowSemiCondensed_700Bold',
} as const;

export const type = {
  display: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44 },
  h1: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36 },
  h2: { fontFamily: fonts.displayBold, fontSize: 24, lineHeight: 28 },
  h3: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23 },
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
