/**
 * Weight units.
 *
 * Grams are canonical: the only thing stored, the only thing the estimator and
 * the inaccuracy tiers ever see. A unit is a display concern that never leaves
 * the screen.
 *
 * oz rather than lb, deliberately. US kitchen scales toggle g/oz, and nearly
 * every food portion is under a pound — a lb user would be typing decimals
 * below 1 ("0.3 lb" for 136 g), carrying fewer significant digits for the same
 * keystrokes. lb belongs on body weight, not on a plate.
 *
 * REVERT: set ENABLED to false. The selector disappears, every weight field is
 * grams again, and nothing downstream changes. In production this belongs on
 * the feature-flag system so it can be killed without a deploy.
 */

export const UNITS_ENABLED = true;

export type WeightUnit = 'g' | 'oz';

type UnitDef = { key: WeightUnit; label: string; perUnit: number; dp: number };

export const WEIGHT_UNITS: UnitDef[] = [
  { key: 'g', label: 'g', perUnit: 1, dp: 0 },
  { key: 'oz', label: 'oz', perUnit: 28.349523125, dp: 1 },
];

export const DEFAULT_UNIT: WeightUnit = 'g';

export const unitDef = (u: WeightUnit): UnitDef =>
  WEIGHT_UNITS.find((d) => d.key === u) ?? WEIGHT_UNITS[0];

/** what someone typed, in the unit on screen -> canonical grams */
export function toGrams(value: string, unit: WeightUnit = DEFAULT_UNIT): number | null {
  const n = Number(String(value).replace(/[^0-9.\-]/g, ''));
  if (!Number.isFinite(n) || String(value).trim() === '') return null;
  return n * unitDef(unit).perUnit;
}

/** canonical grams -> a display string in the unit on screen */
export function fromGrams(grams: number | null, unit: WeightUnit = DEFAULT_UNIT): string {
  if (grams == null || !Number.isFinite(grams)) return '';
  const d = unitDef(unit);
  return (grams / d.perUnit).toFixed(d.dp).replace(/\.0$/, '');
}

/**
 * The gram equivalent shown under an oz field. Round-trip drift across
 * 28 g – 1 kg peaks at 1.03 g, below the 2.83 g granularity of one 0.1 oz
 * step, so nothing visible moves.
 */
export function gramEcho(value: string, unit: WeightUnit): string {
  if (!UNITS_ENABLED || unit === 'g') return '';
  const g = toGrams(value, unit);
  return g == null ? '' : `${Math.round(g)} g`;
}

/** convert a typed string from one unit to another without drifting through zero */
export function convertDisplay(value: string, from: WeightUnit, to: WeightUnit): string {
  const g = toGrams(value, from);
  return g == null ? '' : fromGrams(g, to);
}
