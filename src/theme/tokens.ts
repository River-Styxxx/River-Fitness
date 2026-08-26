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
  // pale blue surface family (light theme)
  sky50: '#e3eefb',
  sky100: '#d2e3f7',
  sky200: '#bcd5ef',
  // deep blue — chrome, then progressively darker for input fills
  deep700: '#1b3a5c',
  deep800: '#14304d',
  deep900: '#0b2038',
  deep950: '#071829',
  // near-black — the edge that separates dark blue panels from the pale page
  coal: '#0a0d12',
  // scarlet — the header date and clock. Not a signal colour: signal.error
  // stays reserved for things that went wrong.
  scarlet: '#3d0508',
  // blood orange — the active nav item
  bloodOrange: '#e86035',

  // yellows — text
  gold400: '#f5c518',
  gold300: '#ffd95e',
  gold600: '#c9a015',
  gold700: '#8a6f10',

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

/** chrome accents — not domain colours, not signals */
export const accent = {
  scarlet: palette.scarlet,
  bloodOrange: palette.bloodOrange,
};

export const signal = {
  success: palette.signalGreen,
  error: palette.signalRed,
  attention: palette.signalYellow, // triage
};

export const surface = {
  bg: palette.deep950, // margins take the same fill as the text boxes
  raised: palette.deep700, // header and nav chrome — unchanged
  card: palette.deep700, // panels around the fields stay dark blue
  line: palette.deep800,
  field: palette.deep950, // the boxes you type in — darkest surface
  edge: palette.coal, // near-black rim around every dark blue panel
};

export const text = {
  primary: palette.gold400,
  secondary: palette.gold300,
  muted: palette.gold600,
  faint: palette.gold700,
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
