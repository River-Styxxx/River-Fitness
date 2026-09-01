/**
 * How wrong is this entry likely to be?
 *
 * Error here is dominated by PORTION, then item identity, then macro
 * attribution. Weight is worth more than everything else combined, which is why
 * every suggestion ladder ends up pointing at a scale.
 *
 * The percentages are placeholders. No calibration data exists yet —
 * `estimate_runs.corrected_kcal` is null on every row. They are replaced by
 * measured error once corrections accumulate, which is why `tier_id` and
 * `tier_pct` are stored on every entry: without them we would know an entry was
 * wrong but not what information was missing when it was logged.
 *
 * Where the estimator has already produced a kcal_low/kcal_high band, use that
 * instead of any of this — a measured band beats a guessed one.
 */

export type MealShape = {
  items: { weightG: number | null; kcal: number | null; protein: number | null; carbs: number | null; fat: number | null }[];
  totalWeightG: number | null;
  photos: { top: boolean; angle: boolean; label: boolean };
  context: {
    restaurant: boolean;
    amorphous: boolean;
    discrete: boolean;
    library: boolean;
    packaged: boolean;
  };
};

export const emptyContext = (): MealShape['context'] => ({
  restaurant: false,
  amorphous: false,
  discrete: false,
  library: false,
  packaged: false,
});

export type Tier = { id: number; pct: number };

/** Tier 0 is a complete entry — the one case that skips the warning entirely. */
export function baseTier(m: MealShape): Tier {
  const any = m.items.length > 0;
  const allWeighed = any && m.items.every((i) => i.weightG != null);
  const allMacros =
    any &&
    m.items.every(
      (i) => i.kcal != null && i.protein != null && i.carbs != null && i.fat != null
    );

  if (allWeighed && allMacros) return { id: 0, pct: 8 };
  if (allWeighed) return { id: 1, pct: 12 };
  if (m.totalWeightG != null) return { id: 2, pct: 18 };
  if (allMacros) return { id: 3, pct: 25 };
  if (m.photos.top && m.photos.angle) return { id: 4, pct: 27 };
  if (m.photos.top || m.photos.angle) return { id: 5, pct: 32 };
  return { id: 6, pct: 40 };
}

export function tierFor(m: MealShape): Tier {
  const base = baseTier(m);
  let pct = base.pct;
  const weighed = m.totalWeightG != null || m.items.some((i) => i.weightG != null);

  // a label plus a weight is the tightest an entry gets; a label alone still
  // leaves the serving count guessed
  if (m.photos.label && weighed) {
    pct = 8;
  } else if (m.photos.label) {
    pct = 20;
  } else {
    if (m.context.library) pct = Math.max(8, pct - 5);
    if (m.context.discrete) pct = Math.max(8, pct - 8);
    // only matters while the mass is unknown — a scale settles it
    if (m.context.amorphous && m.totalWeightG == null) pct += 8;
  }
  // hidden cooking fat does not yield to a scale
  if (m.context.restaurant && !m.photos.label) pct += 10;

  return { id: base.id, pct: Math.round(pct) };
}

export type Suggestion = { text: string; to: number };

/** The single missing input worth the most, and the band it would buy. */
export function suggestionFor(m: MealShape): Suggestion {
  const probe = (mutate: (c: MealShape) => void): number => {
    const copy: MealShape = {
      items: m.items.map((i) => ({ ...i })),
      totalWeightG: m.totalWeightG,
      photos: { ...m.photos },
      context: { ...m.context },
    };
    mutate(copy);
    return tierFor(copy).pct;
  };

  if (m.totalWeightG == null) {
    return {
      text: 'Put the whole plate on a scale and enter the total weight',
      to: probe((c) => {
        c.totalWeightG = 400;
      }),
    };
  }
  if (m.context.packaged && !m.photos.label) {
    return {
      text: 'Snap the nutrition label',
      to: probe((c) => {
        c.photos.label = true;
      }),
    };
  }
  if (m.items.some((i) => i.weightG == null)) {
    return {
      text: 'Weigh each item separately',
      to: probe((c) => c.items.forEach((i) => (i.weightG = 100))),
    };
  }
  if (!m.photos.top && !m.photos.angle) {
    return {
      text: 'Add a top-down and a 45° shot',
      to: probe((c) => {
        c.photos.top = true;
        c.photos.angle = true;
      }),
    };
  }
  if (!m.photos.angle) {
    return { text: 'Add the 45° angle', to: probe((c) => (c.photos.angle = true)) };
  }
  return {
    text: 'Fill in protein, carbs and fat for each item',
    to: probe((c) =>
      c.items.forEach((i) => {
        i.protein = i.protein ?? 10;
        i.carbs = i.carbs ?? 10;
        i.fat = i.fat ?? 5;
        i.kcal = i.kcal ?? 125;
      })
    ),
  };
}

/** The suggestion is only worth showing when the entry is genuinely loose. */
export const SUGGESTION_GATE = 20;

/**
 * Errors combine in quadrature, not by averaging — these are independent
 * measurements, so a day is tighter than its worst meal. Someone who logs six
 * meals carefully gets a visibly narrower band than someone who logs two
 * vaguely, which is the property worth having.
 *
 * Caveat: independence is an assumption. A habitual under-estimator is wrong in
 * the same direction every time and their real band is wider than this.
 */
export function combineBands(entries: { kcal: number; pct: number }[]): {
  kcal: number;
  abs: number;
  pct: number;
} {
  const kcal = entries.reduce((a, e) => a + e.kcal, 0);
  if (!kcal) return { kcal: 0, abs: 0, pct: 0 };
  const abs = Math.sqrt(
    entries.reduce((a, e) => a + Math.pow((e.kcal * e.pct) / 100, 2), 0)
  );
  return { kcal, abs, pct: (abs / kcal) * 100 };
}

/**
 * Per-macro bands. Fat absorbs almost all of the hidden-cooking-oil error;
 * protein sources are discrete and their content is stable.
 *
 * These deliberately do not recombine to the total — quadrature over them comes
 * out tighter, because a portion mistake moves all three macros together. The
 * total is the anchor; these are for display.
 */
export const MACRO_BAND_MULT = { protein: 0.8, carbs: 1.0, fat: 1.4 } as const;

export const macroBand = (basePct: number, macro: keyof typeof MACRO_BAND_MULT): number =>
  Math.round(basePct * MACRO_BAND_MULT[macro]);

/** `1,600 ± 212 kcal (±13%)` */
export function formatBand(kcal: number, pct: number): string {
  const abs = Math.round((kcal * pct) / 100);
  return `${Math.round(kcal).toLocaleString('en-US')} ± ${abs.toLocaleString('en-US')} kcal (±${Math.round(pct)}%)`;
}
