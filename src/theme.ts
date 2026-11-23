// Design-Tokens (Dark-Mode-first). Alle Screens nutzen nur diese Werte.
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
  streak: '#FF7A18',
} as const;

// Rang-Farben: Eisen → Titan
export const rankColors = [
  '#7A7F8C', // 1 Eisen
  '#B8733D', // 2 Bronze
  '#C9D1DC', // 3 Silber
  '#F5C451', // 4 Gold
  '#4FD1C5', // 5 Platin
  '#5AB8FF', // 6 Diamant
  '#B05CFF', // 7 Meister
  '#FF4D6D', // 8 Titan
] as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 } as const;

export const font = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700' as const },
  h1: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: '600' as const },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700' as const, letterSpacing: 0.7 },
};
