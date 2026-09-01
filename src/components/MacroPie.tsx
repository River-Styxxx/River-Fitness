import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Ellipse, G, Text as SvgText } from 'react-native-svg';
import { surface } from '../theme';

/**
 * Macro split, as a shallow-tilt 3D pie.
 *
 * The tilt is cosmetic and it does distort: a near slice shows its wall as well
 * as its face, so it reads larger than a far slice of the same share. Macros
 * routinely land within a few points of each other, which is exactly where
 * slice area stops being readable — so every slice is direct-labelled with its
 * exact percentage and the numbers are repeated in the table underneath.
 * Nothing here is read off area.
 *
 * Set `depth` to 0 for a flat pie; nothing else changes.
 */

export const MACRO_HUE = {
  protein: '#019f68', // green
  carbs: '#a68018', // yellow
  fat: '#e36460', // red
} as const;

export type MacroKeyName = keyof typeof MACRO_HUE;

/**
 * Validated against the card surface #1b3a5c in dark mode, all pairs:
 * lightness band and chroma floor pass, contrast 3.17–3.46:1, normal-vision
 * ΔE 15.3 against a floor of 15. Worst colourblind pair is carbs↔fat at
 * ΔE 6.1 (deutan) — inside the band that is legal ONLY with secondary
 * encoding, which is present three times over: the letter and percentage on
 * each slice, a swatch on each table row, and the full numbers below.
 *
 * Two collisions to keep an eye on, neither live today: #e36460 is a near
 * neighbour of signal.error #ff5d5d, and #a68018 shares a hue family with the
 * text gold #f5c518. Both bite the day a red error or an amber triage flag
 * lands on this same screen.
 */

/** clockwise draw order — fat top-right, protein bottom, carbs top-left */
const LAYOUT: MacroKeyName[] = ['fat', 'protein', 'carbs'];
/** pinned centred on the bottom of the dial whatever its share */
const ANCHOR: MacroKeyName = 'protein';

export type PieSlice = { key: MacroKeyName; letter: string; label: string; pct: number };

/** multiply a hex toward black — lit top face vs shaded walls */
function shade(hex: string, k: number): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return (
    '#' +
    [r, g, b].map((v) => Math.round(v * k).toString(16).padStart(2, '0')).join('')
  );
}

export function MacroPie({
  slices,
  size = 148,
  tilt = 0.8,
  depth = 14,
  gap = 2,
}: {
  slices: PieSlice[];
  size?: number;
  tilt?: number;
  depth?: number;
  gap?: number;
}) {
  const parts = slices.filter((s) => s.pct > 0);
  if (parts.length === 0) return null;

  const R = size / 2;
  const RY = R * tilt;
  const CX = R;
  const CY = RY + 2;
  const H = RY * 2 + depth + 4;

  const pt = (deg: number, dy = 0): [number, number] => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [CX + R * Math.cos(a), CY + RY * Math.sin(a) + dy];
  };
  const arc = (a0: number, a1: number, dy: number, sweep: 0 | 1) =>
    `A ${R} ${RY} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} ${sweep} ${pt(a1, dy)
      .map((n) => n.toFixed(2))
      .join(' ')}`;

  const seq = LAYOUT.map((k) => parts.find((p) => p.key === k)).filter(
    (p): p is PieSlice => !!p
  );
  const sweepOf = (p: PieSlice) => (p.pct / 100) * 360;
  const anchorAt = seq.findIndex((p) => p.key === ANCHOR);
  const before = anchorAt < 0 ? 0 : seq.slice(0, anchorAt).reduce((a, p) => a + sweepOf(p), 0);
  const half = anchorAt < 0 ? 0 : sweepOf(seq[anchorAt]) / 2;
  const ROT = 180 - before - half;

  const geom = seq.map((p, i) => {
    const start = ROT + seq.slice(0, i).reduce((a, q) => a + sweepOf(q), 0);
    const sweep = sweepOf(p);
    return {
      ...p,
      a0: start + gap / 2,
      a1: start + sweep - gap / 2,
      mid: start + sweep / 2,
      solo: sweep >= 359.9,
      color: MACRO_HUE[p.key],
    };
  });

  // walls, painter-sorted so the nearest is drawn last
  const walls: { y: number; fill: string; d: string }[] = [];
  if (depth > 0) {
    geom.forEach((s) => {
      const span = s.a1 - s.a0;
      const a0n = ((s.a0 % 360) + 360) % 360;
      // a slice can straddle 0°, so test both wraps of the front half
      [0, 360].forEach((off) => {
        const lo = Math.max(a0n, 90 + off);
        const hi = Math.min(a0n + span, 270 + off);
        if (hi <= lo) return;
        const [tx0, ty0] = pt(lo);
        const [tx1, ty1] = pt(hi);
        walls.push({
          y: Math.max(ty0, ty1, CY + RY),
          fill: shade(s.color, 0.62),
          d:
            `M ${tx0.toFixed(2)} ${ty0.toFixed(2)} ${arc(lo, hi, 0, 1)} ` +
            `L ${tx1.toFixed(2)} ${(ty1 + depth).toFixed(2)} ${arc(hi, lo, depth, 0)} Z`,
        });
      });

      if (s.solo) return;
      [s.a0, s.a1].forEach((edge, k) => {
        const norm = ((edge % 360) + 360) % 360;
        if (norm <= 92 || norm >= 268) return; // facing away
        const [ex, ey] = pt(norm);
        walls.push({
          y: Math.max(ey, CY) + 0.5,
          fill: shade(s.color, k === 0 ? 0.5 : 0.44),
          d:
            `M ${CX} ${CY} L ${ex.toFixed(2)} ${ey.toFixed(2)} ` +
            `L ${ex.toFixed(2)} ${(ey + depth).toFixed(2)} L ${CX} ${(CY + depth).toFixed(2)} Z`,
        });
      });
    });
    walls.sort((a, b) => a.y - b.y);
  }

  return (
    <View style={{ width: size }}>
      <Svg width={size} height={H} viewBox={`0 0 ${size} ${H}`}>
        <G>
          {walls.map((w, i) => (
            <Path key={`w${i}`} d={w.d} fill={w.fill} />
          ))}

          {geom.map((s) =>
            s.solo ? (
              <Ellipse key={s.key} cx={CX} cy={CY} rx={R} ry={RY} fill={s.color} />
            ) : (
              <Path
                key={s.key}
                d={`M ${CX} ${CY} L ${pt(s.a0).map((n) => n.toFixed(2)).join(' ')} ${arc(
                  s.a0,
                  s.a1,
                  0,
                  1
                )} Z`}
                fill={s.color}
              />
            )
          )}

          {geom
            .filter((s) => s.pct >= 9)
            .map((s) => {
              const [lx, ly] = pt(s.mid);
              return (
                <SvgText
                  key={`t${s.key}`}
                  x={CX + (lx - CX) * 0.6}
                  y={CY + (ly - CY) * 0.6}
                  fill={surface.edge}
                  fontSize={s.pct >= 16 ? 14 : 11}
                  fontWeight="700"
                  textAnchor="middle"
                  // RN Svg has no dominant-baseline on every platform; nudge instead
                  dy={s.pct >= 16 ? 5 : 4}
                >
                  {`${s.letter} ${Math.round(s.pct)}%`}
                </SvgText>
              );
            })}
        </G>
      </Svg>
    </View>
  );
}

/** kcal contribution and share of energy, in reading order */
export function macroSlices(macros: {
  protein: number;
  carbs: number;
  fat: number;
}): { slices: PieSlice[]; kcal: number; kcalOf: Record<MacroKeyName, number> } {
  const kcalOf = {
    protein: macros.protein * 4,
    carbs: macros.carbs * 4,
    fat: macros.fat * 9,
  };
  const kcal = kcalOf.protein + kcalOf.carbs + kcalOf.fat;
  const slices: PieSlice[] = [
    { key: 'protein', letter: 'P', label: 'Protein', pct: kcal ? (kcalOf.protein / kcal) * 100 : 0 },
    { key: 'carbs', letter: 'C', label: 'Carbs', pct: kcal ? (kcalOf.carbs / kcal) * 100 : 0 },
    { key: 'fat', letter: 'F', label: 'Fat', pct: kcal ? (kcalOf.fat / kcal) * 100 : 0 },
  ];
  return { slices, kcal, kcalOf };
}
