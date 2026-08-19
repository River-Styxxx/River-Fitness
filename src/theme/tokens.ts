/**
 * River Fitness design tokens.
 * Three layers: primitives -> semantic -> component. Components import from
 * `theme` (semantic+) only — never from primitives directly.
 *
 * Math system (per spec):
 * - Spacing: Fibonacci (2/3/5/8/13/21/34/55)
 * - Type scale: sqrt(phi) ~ 1.272 (two steps compose to phi)
 * - Dark default: lifted 300–400-range desaturated values, not darkened hues
 */

// ---------- primitives ----------
const palette = {
  // nutrition — green
  green300: '#7fd4a5',
  green400: '#55c98b',
  green600: '#1e8f5a',
  // coaching / wisdom — blue (cyan end)
  blue300: '#7cc4e8',
  blue400: '#54aede',
  blue600: '#1d6fa8',
  // sleep — navy (deep end of blue)
  navy300: '#8b9dd6',
  navy400: '#6478bf',
  navy700: '#2b3a6b',
  // training — red/orange
  ember300: '#f2a179',
  ember400: '#ec8354',
  ember600: '#c04f1e',
  // signals (reserved — never used as domain accents)
  signalGreen: '#3ddc84',
  signalRed: '#ff5d5d',
  signalYellow: '#f5c518', // triage / attention (amber; distinct from ember)
  // neutrals — dark surface family
  ink950: '#0b0e14',
  ink900: '#11151d',
  ink800: '#1a2029',
  ink700: '#242c38',
  ink500: '#4a5568',
  mist300: '#8b96a5',
  mist100: '#c9d1dc',
  paper: '#f2f4f7',
};

// ---------- semantic ----------
export type Domain = 'nutrition' | 'coaching' | 'sleep' | 'training';

export const domainColor: Record<Domain, string> = {
  nutrition: palette.green400,
  coaching: palette.blue400,
  sleep: palette.navy400,
  training: palette.ember400,
};

export const domainColorSoft: Record<Domain, string> = {
  nutrition: palette.green300,
  coaching: palette.blue300,
  sleep: palette.navy300,
  training: palette.ember300,
};

export const signal = {
  success: palette.signalGreen,
  error: palette.signalRed,
  attention: palette.signalYellow, // triage
};

export const surface = {
  bg: palette.ink950,
  raised: palette.ink900,
  card: palette.ink800,
  line: palette.ink700,
};

export const text = {
  primary: palette.paper,
  secondary: palette.mist100,
  muted: palette.mist300,
  faint: palette.ink500,
};

// Fibonacci spacing
export const space = { xs: 3, s: 5, m: 8, l: 13, xl: 21, xxl: 34, xxxl: 55 } as const;

// sqrt(phi) type scale from 13
const R = 1.272;
export const font = {
  micro: Math.round(13 / R), // 10
  small: 13,
  body: Math.round(13 * R), // 17
  title: Math.round(13 * R * R), // 21 (~phi over 13)
  heading: Math.round(13 * R * R * R), // 27
  display: Math.round(13 * R * R * R * R), // 34
} as const;

// squircle-leaning radii
export const radius = { s: 8, m: 13, l: 21, pill: 999 } as const;

// golden angle — phyllotaxis + hue stepping
export const GOLDEN_ANGLE = 137.50776405003785;

// ---------- layout shell ----------
// Fibonacci widths. The app reads at phone width on every viewport; wide
// screens get side rails (left = menu, right = notes/tips) instead of stretching.
export const layout = {
  content: 377, // Fib — the reading column
  rail: 233, // Fib — one side rail
  gutter: space.xl, // 21
  compactUpTo: 610, // Fib — at or below this the column runs full bleed (phones)
  railsFrom: 987, // Fib — viewport width at which rails are allowed to appear
} as const;
