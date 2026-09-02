import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import {
  getDailySummaries,
  getEntriesForDate,
  getTargets,
  logMeal,
  updateEntry,
  deleteEntry,
  addFoodToMeal,
  uploadMealPhotos,
  uploadEntryPhotos,
  DailySummary,
  FoodLogEntry,
  NutritionTarget,
  Client,
} from '../data';
import { Screen, Card, H2, Body, Small, StatTile, MacroMeter, Row, Button, Loading } from '../components/ui';
import { surface, text, space, font, radius, signal, domainColor } from '../theme';
import { PhotoShots, Shot } from '../components/PhotoShots';
import type { PickedPhoto } from '../lib/photos';
import { estimateFromPhotos } from '../lib/estimate';
import { EditSheet, SheetField, SheetLock } from '../components/EditSheet';
import {
  MealComposer,
  derive,
  DraftItem,
  MealMacros,
  emptyItem,
  emptyMacros,
  toMealItems,
  toMealMacros,
} from '../components/MealComposer';
import {
  InaccuracySheet,
  TimeStampSheet,
  SummarySheet,
  MacroBreakdown,
  Stamp,
  nowStamp,
  stampToISO,
  clock12,
} from '../components/LogFlowSheets';
import {
  MealShape,
  emptyContext,
  tierFor,
  suggestionFor,
  combineBands,
  macroBand,
  formatBand,
  SUGGESTION_GATE,
} from '../lib/inaccuracy';
import {
  WeightUnit,
  DEFAULT_UNIT,
  UNITS_ENABLED,
  WEIGHT_UNITS,
  toGrams,
  fromGrams,
  gramEcho,
  unitDef,
  convertDisplay,
} from '../lib/units';

function todayLocal(tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
}

/**
 * The daily log. Rendered for a client viewing their own day, and for a coach
 * viewing their own — a coach is a client of their own practice.
 */
export function TodayScreen({
  client,
  tenantId,
  readOnly = false,
  date: dateOverride,
}: {
  client: Client | null;
  tenantId: string | null;
  /** coach view: the same day the client sees, without the place to log into it */
  readOnly?: boolean;
  /** pin the view to one day instead of today */
  date?: string;
}) {
  const [entries, setEntries] = useState<FoodLogEntry[] | null>(null);
  const [today, setToday] = useState<DailySummary | null>(null);
  const [target, setTarget] = useState<NutritionTarget | null>(null);
  const [items, setItems] = useState<DraftItem[]>([emptyItem('i0')]);
  const [mealMacros, setMealMacros] = useState<MealMacros>(emptyMacros());
  const [shots, setShots] = useState<Partial<Record<Shot, PickedPhoto>>>({});
  const [totalWeight, setTotalWeight] = useState('');
  const [unit, setUnit] = useState<WeightUnit>(DEFAULT_UNIT);
  const [context] = useState(emptyContext());
  const [stamp, setStamp] = useState<Stamp>(nowStamp());
  const [step, setStep] = useState<'idle' | 'warn' | 'stamp' | 'summary'>('idle');
  const [pending, setPending] = useState<{ pct: number; id: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyMeal, setBusyMeal] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<{ mealId: string; at: string } | null>(null);
  /**
   * Shots for the one food being added, kept apart from the composer's `shots`.
   * A photo of the protein bar you forgot is not a photo of the plate, and the
   * two would otherwise overwrite each other's slots.
   */
  const [addShots, setAddShots] = useState<Partial<Record<Shot, PickedPhoto>>>({});
  const [estimating, setEstimating] = useState(false);
  const [estimateNote, setEstimateNote] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const date = dateOverride ?? (client ? todayLocal(client.timezone) : '');

  const load = useCallback(async () => {
    if (!client) return;
    const [e, sums, ts] = await Promise.all([
      getEntriesForDate(client.id, date),
      getDailySummaries(client.id, 1000),
      getTargets(client.id),
    ]);
    setEntries(e);
    setToday(sums.find((s) => s.local_date === date) ?? null);
    setTarget(ts.find((t) => t.day_type === 'default') ?? ts[0] ?? null);
  }, [client, date]);

  useEffect(() => {
    load().catch((e) => setErr(String(e)));
  }, [load]);

  if (!client) return <Loading />;

  const shotCount = Object.keys(shots).length;
  // a photo, or a named food — either is enough to ask for an estimate
  const namedCount = items.filter((i) => i.description.trim().length > 0).length;
  const canEstimate = shotCount > 0 || namedCount > 0;

  async function estimate() {
    setEstimateNote(null);
    setEstimating(true);
    try {
      const blobs = (Object.keys(shots) as Shot[]).map((kind) => ({ kind, blob: shots[kind]!.blob }));
      // with no photos the written descriptions and their weights carry the request
      const described = toMealItems(items, unit).map((i) => ({
        description: i.description,
        qty: i.qty,
        grams: i.weightG ?? null,
      }));
      const out = await estimateFromPhotos(blobs, {
        clientId: client?.id ?? null,
        tenantId,
        totalWeightG: toGrams(totalWeight, unit),
        items: described,
      });
      if (out.status === 'ok') {
        // estimates are a starting point, not an answer — they land in the same
        // editable fields the client would have typed into
        setItems(
          out.items.map((it, i) => ({
            ...emptyItem(`e${Date.now()}_${i}`),
            description: it.description,
            qty: it.qty ?? '',
            kcal: it.kcal != null ? String(Math.round(it.kcal)) : '',
            protein: it.protein_g != null ? String(Math.round(it.protein_g)) : '',
            carbs: it.carbs_g != null ? String(Math.round(it.carbs_g)) : '',
            fat: it.fat_g != null ? String(Math.round(it.fat_g)) : '',
            open: true,
          }))
        );
        setEstimateNote('Estimated from your photos — check it and correct anything that’s off.');
      } else {
        setEstimateNote(`${out.reason} Fill in what you know and log it anyway.`);
      }
    } finally {
      setEstimating(false);
    }
  }

  /** What the tier engine reads: grams, photos, context — never display units. */
  function shapeOf(): MealShape {
    const mealItems = toMealItems(items, unit);
    return {
      items: mealItems.map((i) => ({
        weightG: i.weightG ?? null,
        kcal: i.kcal ?? null,
        protein: i.protein_g ?? null,
        carbs: i.carbs_g ?? null,
        fat: i.fat_g ?? null,
      })),
      totalWeightG: toGrams(totalWeight, unit),
      // a shot of one food counts the same as a shot of the plate — the
      // estimator gets the same view either way, so the tier should not
      // penalise someone for photographing item by item
      photos: {
        top: shots.top != null || items.some((i) => i.shots?.top != null),
        angle: shots.angle != null || items.some((i) => i.shots?.angle != null),
        label: shots.label != null || items.some((i) => i.shots?.label != null),
      },
      context: {
        ...context,
        packaged: shots.label != null || items.some((i) => i.shots?.label != null),
      },
    };
  }

  /** Totals for the meal being logged, from per-item macros or the meal block. */
  function draftMacros() {
    const mealItems = toMealItems(items, unit);
    const anyPerItem = mealItems.some(
      (i) => i.kcal != null || i.protein_g != null || i.carbs_g != null || i.fat_g != null
    );
    if (anyPerItem) {
      const sum = (k: 'protein_g' | 'carbs_g' | 'fat_g') =>
        mealItems.reduce((a, i) => a + (i[k] ?? 0), 0);
      return { protein: sum('protein_g'), carbs: sum('carbs_g'), fat: sum('fat_g') };
    }
    const m = toMealMacros(mealMacros);
    return { protein: m.protein_g ?? 0, carbs: m.carbs_g ?? 0, fat: m.fat_g ?? 0 };
  }

  const draft = draftMacros();
  const draftKcal = draft.protein * 4 + draft.carbs * 4 + draft.fat * 9;

  /**
   * Step 1. A complete entry skips the warning entirely — that is the original
   * trigger, and tier 0 is exactly "nothing is missing".
   */
  function beginLog() {
    if (!client || !tenantId) return;
    if (toMealItems(items, unit).length === 0) {
      setErr('Add at least one food.');
      return;
    }
    setErr(null);
    const tier = tierFor(shapeOf());
    setPending({ pct: tier.pct, id: tier.id });
    setStamp(nowStamp());
    setStep(tier.id === 0 ? 'stamp' : 'warn');
  }

  /**
   * Fill in a meal that was logged without numbers.
   *
   * Runs AFTER the meal is already saved, never before — the spec's rule is
   * that the log is never blocked on an estimate. The row appears as pending
   * immediately and fills itself in a few seconds later. Before this existed
   * `pending` was terminal: nothing in the system ever came back for it.
   *
   * Only writes when the mapping is unambiguous — one logged row, or the model
   * returned exactly as many foods as were logged. A model that splits
   * "chicken and rice" into two rows against one logged line is not something
   * to guess at, so those stay pending for a person to finish.
   */
  async function autoEstimate(
    entryIds: string[],
    described: { description: string; qty?: string; grams?: number | null }[],
    photos: { kind: Shot; blob: Blob }[],
    weightG: number | null
  ) {
    try {
      const out = await estimateFromPhotos(photos, {
        clientId: client?.id ?? null,
        tenantId,
        totalWeightG: weightG,
        items: described,
      });
      if (out.status !== 'ok' || out.items.length === 0) return;

      // Only write what the model actually returned. Writing null for a macro
      // it omitted silently blanks a field, and a null kcal demotes the row
      // back to pending — which is exactly how a filled-in meal loses one line.
      const filled = (i: (typeof out.items)[number]) => {
        const patch: Record<string, number> = {};
        if (i.kcal != null) patch.kcal = Math.round(i.kcal);
        if (i.protein_g != null) patch.protein_g = Math.round(i.protein_g);
        if (i.carbs_g != null) patch.carbs_g = Math.round(i.carbs_g);
        if (i.fat_g != null) patch.fat_g = Math.round(i.fat_g);
        if (i.fiber_g != null) patch.fiber_g = Math.round(i.fiber_g);
        return patch;
      };

      if (entryIds.length === 1) {
        // one row: carry the whole estimate onto it, summed
        const sum = (k: 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g' | 'fiber_g') =>
          out.items.reduce((a, i) => a + (i[k] ?? 0), 0);
        await updateEntry(entryIds[0], {
          description: out.items.length === 1 ? out.items[0].description : described[0].description,
          kcal: Math.round(sum('kcal')),
          protein_g: Math.round(sum('protein_g')),
          carbs_g: Math.round(sum('carbs_g')),
          fat_g: Math.round(sum('fat_g')),
          fiber_g: out.items.some((i) => i.fiber_g != null) ? Math.round(sum('fiber_g')) : null,
        });
      } else if (out.items.length === entryIds.length) {
        // one at a time, not Promise.all — a single failure should cost one row,
        // not leave the rest of the meal in an unknown state
        for (let i = 0; i < entryIds.length; i++) {
          await updateEntry(entryIds[i], {
            description: out.items[i].description,
            ...filled(out.items[i]),
          });
        }
      } else {
        return; // ambiguous — leave it for a person
      }
      await load();
    } catch {
      // the meal is already saved; a failed estimate costs nothing but the numbers
    }
  }

  async function commit() {
    if (!client || !tenantId) return;
    try {
      const mealItems = toMealItems(items, unit);
      const { mealId, entryIds } = await logMeal({
        clientId: client.id,
        tenantId,
        items: mealItems,
        mealMacros: toMealMacros(mealMacros),
        at: stampToISO(stamp),
        tier: pending ? { id: pending.id, pct: pending.pct } : null,
      });

      // logMeal drops blank rows the same way toMealItems does, so index i of
      // this list is index i of entryIds — that pairing is what lets a food's
      // own photos find the row they belong to
      const composed = items.filter((i) => i.description.trim());

      // the meal is already committed; photos are a best-effort follow-up so a
      // bad connection costs a photo, not someone's dinner
      const photos = (Object.keys(shots) as Shot[]).map((kind) => ({
        kind,
        blob: shots[kind]!.blob,
        thumb: shots[kind]!.thumb,
      }));
      if (photos.length > 0) {
        const out = await uploadMealPhotos({ clientId: client.id, tenantId, mealId, photos });
        if (out.failed.length > 0) setErr(`Meal saved. Photo upload failed — ${out.failed[0]}`);
      }

      // photos taken of one food hang off that food's row, not the meal's
      const itemPhotos = composed.map((it) =>
        (Object.keys(it.shots ?? {}) as Shot[]).map((kind) => ({
          kind,
          blob: it.shots[kind]!.blob,
          thumb: it.shots[kind]!.thumb,
        }))
      );
      for (let i = 0; i < composed.length; i++) {
        if (itemPhotos[i].length === 0) continue;
        const out = await uploadEntryPhotos({
          clientId: client.id,
          tenantId,
          entryId: entryIds[i],
          photos: itemPhotos[i],
        });
        if (out.failed.length > 0) setErr(`Meal saved. Photo upload failed — ${out.failed[0]}`);
      }

      // snapshot what the estimate needs before the composer is cleared
      const described = mealItems.map((i) => ({
        description: i.description,
        qty: i.qty,
        grams: i.weightG ?? null,
      }));
      const weightSnapshot = toGrams(totalWeight, unit);

      /**
       * A food with its own photos is its own question, so it gets its own
       * call — that photo is a better view of it than the plate shot is. The
       * rest go through the meal-level estimate exactly as before, which means
       * a meal where nobody used per-item photos behaves identically to
       * yesterday: one request, not one per food.
       */
      const ownPhoto: number[] = [];
      const viaMeal: number[] = [];
      mealItems.forEach((it, i) => {
        if (it.kcal != null) return; // already has numbers, nothing to work out
        (itemPhotos[i].length > 0 ? ownPhoto : viaMeal).push(i);
      });

      setItems([emptyItem(`i${Date.now()}`)]);
      setMealMacros(emptyMacros());
      setShots({});
      setTotalWeight('');
      setPending(null);
      await load();

      if (ownPhoto.length > 0 || viaMeal.length > 0) {
        setEstimateNote('Working out the numbers…');
        for (const i of ownPhoto) {
          await autoEstimate([entryIds[i]], [described[i]], itemPhotos[i], described[i].grams ?? null);
        }
        if (viaMeal.length > 0) {
          await autoEstimate(
            viaMeal.map((i) => entryIds[i]),
            viaMeal.map((i) => described[i]),
            photos,
            weightSnapshot
          );
        }
        setEstimateNote(null);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'failed');
    }
  }

  /**
   * The day reads as meals, not as a wall of foods.
   *
   * Everything logged in one go shares a meal_id, so that is the grouping —
   * a yogurt bowl entered as five foods is one block with five lines, not five
   * separate cards. Rows imported before meal_id existed carry null, and each
   * of those stands alone rather than collapsing into one giant fake meal.
   */
  const meals = (() => {
    const list = entries ?? [];
    const order: string[] = [];
    const byMeal = new Map<string, FoodLogEntry[]>();
    list.forEach((e) => {
      const key = e.meal_id ?? `solo:${e.id}`;
      if (!byMeal.has(key)) {
        byMeal.set(key, []);
        order.push(key);
      }
      byMeal.get(key)!.push(e);
    });
    return order.map((key) => {
      const rows = byMeal.get(key)!;
      const sum = (f: (e: FoodLogEntry) => number | null) =>
        rows.reduce((a, e) => a + (Number(f(e) ?? 0) || 0), 0);
      return {
        key,
        rows,
        at: rows[0]?.at ?? null,
        kcal: sum((e) => e.kcal as number | null),
        protein: sum((e) => e.protein_g as number | null),
        carbs: sum((e) => e.carbs_g as number | null),
        // null when no row in the meal reported fibre — not the same as zero
        fiber: rows.some((e) => e.fiber_g != null) ? sum((e) => e.fiber_g as number | null) : null,
        // one line short is still a meal with a hole in it
        needsNumbers: rows.some((e) => e.kcal == null),
      };
    });
  })();

  /**
   * Fill in a meal that is already logged.
   *
   * The composer's Estimate button is gone the moment a meal is saved, so
   * without this a row that came out pending had no route back to numbers
   * short of typing them. Reads the foods off the rows themselves.
   */
  async function estimateLogged(rows: FoodLogEntry[]) {
    setBusyMeal(rows[0]?.meal_id ?? rows[0]?.id ?? null);
    try {
      await autoEstimate(
        rows.map((r) => r.id),
        rows.map((r) => ({
          description: r.description,
          qty: r.qty ?? undefined,
          grams: r.weight_g != null ? Number(r.weight_g) : null,
        })),
        [],
        null
      );
    } finally {
      setBusyMeal(null);
    }
  }

  const kcalNow = Number(today?.kcal ?? 0);
  const pNow = Number(today?.protein_g ?? 0);
  const cNow = Number(today?.carbs_g ?? 0);
  const fNow = Number(today?.fat_g ?? 0);
  const fiberNow = today?.fiber_g != null ? Number(today.fiber_g) : null;
  const editing = (entries ?? []).find((e) => e.id === editingId) ?? null;

  const numOrNull = (v: string): number | null => {
    const t = (v ?? '').trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };

  const entryFields = (e: FoodLogEntry): SheetField[] => {
    const shown = (v: number | null) => (v == null ? '' : String(Math.round(Number(v))));
    return [
      { key: 'description', label: 'Food', value: e.description, placeholder: 'what was it?' },
      { key: 'qty', label: 'How Much (words)', value: e.qty ?? '', placeholder: '1 bowl, 2 scoops — no numbers needed' },
      {
        key: 'weight',
        label: 'Weight',
        value: e.weight_g != null ? fromGrams(Number(e.weight_g), unit) : '',
        numeric: true,
        echo: (d) => gramEcho(d.weight ?? '', unit),
        units: UNITS_ENABLED
          ? {
              value: unit,
              options: WEIGHT_UNITS.map((u) => ({ key: u.key, label: u.label })),
              convert: (v, from, to) => convertDisplay(v, from as WeightUnit, to as WeightUnit),
              onChange: (next) => setUnit(next as WeightUnit),
            }
          : undefined,
      },
      { key: 'kcal', label: 'Calories', value: shown(e.kcal as number | null), numeric: true, half: true },
      { key: 'protein', label: 'Protein (g)', value: shown(e.protein_g as number | null), numeric: true, half: true },
      { key: 'carbs', label: 'Carbs (g)', value: shown(e.carbs_g as number | null), numeric: true, half: true },
      { key: 'fat', label: 'Fat (g)', value: shown(e.fat_g as number | null), numeric: true, half: true },
    ];
  };

  // same three-of-four rule the composer uses, so editing behaves like entering
  const macroLock: SheetLock = (d) => {
    const out = derive({
      kcal: d.kcal ?? '',
      protein: d.protein ?? '',
      carbs: d.carbs ?? '',
      fat: d.fat ?? '',
    });
    return out.field === 'none' ? null : { key: out.field, value: out.value };
  };

  async function saveEdit(v: Record<string, string>) {
    if (!editing) return;
    const id = editing.id;
    setEditingId(null);
    try {
      const grams = toGrams(v.weight ?? '', unit);
      await updateEntry(id, {
        description: v.description ?? '',
        qty: v.qty ?? null,
        weightG: grams,
        enteredValue: numOrNull(v.weight ?? ''),
        enteredUnit: (v.weight ?? '').trim() ? unit : null,
        kcal: numOrNull(v.kcal ?? ''),
        protein_g: numOrNull(v.protein ?? ''),
        carbs_g: numOrNull(v.carbs ?? ''),
        fat_g: numOrNull(v.fat ?? ''),
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'could not save that edit');
    }
  }

  /** blank fields for the food being added into an existing meal */
  const addFields = (): SheetField[] => [
    { key: 'description', label: 'Food', value: '', placeholder: 'what was it?' },
    { key: 'qty', label: 'How Much (words)', value: '', placeholder: '1 bowl, 2 scoops — no numbers needed' },
    {
      key: 'weight',
      label: 'Weight',
      value: '',
      numeric: true,
      echo: (d) => gramEcho(d.weight ?? '', unit),
      units: UNITS_ENABLED
        ? {
            value: unit,
            options: WEIGHT_UNITS.map((u) => ({ key: u.key, label: u.label })),
            convert: (v, from, to) => convertDisplay(v, from as WeightUnit, to as WeightUnit),
            onChange: (next) => setUnit(next as WeightUnit),
          }
        : undefined,
    },
    { key: 'kcal', label: 'Calories', value: '', numeric: true, half: true },
    { key: 'protein', label: 'Protein (g)', value: '', numeric: true, half: true },
    { key: 'carbs', label: 'Carbs (g)', value: '', numeric: true, half: true },
    { key: 'fat', label: 'Fat (g)', value: '', numeric: true, half: true },
  ];

  async function saveAdded(v: Record<string, string>) {
    const target = addingTo;
    const photoShots = addShots;
    setAddingTo(null);
    setAddShots({});
    if (!target || !client || !tenantId) return;
    if (!(v.description ?? '').trim()) return;
    try {
      const kcal = numOrNull(v.kcal ?? '');
      const grams = toGrams(v.weight ?? '', unit);
      const id = await addFoodToMeal({
        mealId: target.mealId,
        at: target.at,
        clientId: client.id,
        tenantId,
        description: v.description ?? '',
        qty: v.qty ?? null,
        weightG: grams,
        enteredValue: numOrNull(v.weight ?? ''),
        enteredUnit: (v.weight ?? '').trim() ? unit : null,
        kcal,
        protein_g: numOrNull(v.protein ?? ''),
        carbs_g: numOrNull(v.carbs ?? ''),
        fat_g: numOrNull(v.fat ?? ''),
      });
      await load();

      // the row exists already; photos are a follow-up, same as on a fresh meal
      const photos = (Object.keys(photoShots) as Shot[]).map((kind) => ({
        kind,
        blob: photoShots[kind]!.blob,
        thumb: photoShots[kind]!.thumb,
      }));
      if (photos.length > 0) {
        const out = await uploadEntryPhotos({ clientId: client.id, tenantId, entryId: id, photos });
        if (out.failed.length > 0) setErr(`Food added. Photo upload failed — ${out.failed[0]}`);
      }

      // no numbers given? the same estimate that runs on a fresh log runs here,
      // and now it gets to look at the photos too
      if (kcal == null) {
        setEstimateNote('Working out the numbers…');
        await autoEstimate(
          [id],
          [
            {
              description: (v.description ?? '').trim(),
              qty: (v.qty ?? '').trim() || undefined,
              grams,
            },
          ],
          photos,
          grams
        );
        setEstimateNote(null);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'could not add that');
    }
  }

  async function removeEntry() {
    if (!editing) return;
    const id = editing.id;
    setEditingId(null);
    try {
      await deleteEntry(id);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'could not remove that');
    }
  }

  // the day's band combines each meal's own tier in quadrature; entries logged
  // before tiers existed carry no percentage and simply don't widen it
  const dayBand = combineBands(
    (entries ?? [])
      .filter((e) => e.kcal != null && e.tier_pct != null)
      .map((e) => ({ kcal: Number(e.kcal), pct: Number(e.tier_pct) }))
  );
  const kcalTarget = target?.kcal ? Number(target.kcal) : null;
  const pTarget = target?.protein_g ? Number(target.protein_g) : null;
  const cTarget = target?.carbs_g ? Number(target.carbs_g) : null;
  const fTarget = target?.fat_g ? Number(target.fat_g) : null;

  // read-only means this is embedded in the coach's client page, which already
  // provides the scrolling column — a second Screen here would nest two
  // ScrollViews and double the framing
  const Shell = readOnly
    ? ({ children }: { children: React.ReactNode; onRefresh?: () => void | Promise<void> }) => (
        <View>{children}</View>
      )
    : Screen;
  // embedded in the coach page, the outer screen owns the pull gesture
  const shellProps = readOnly ? {} : { onRefresh: load };

  return (
    <Shell {...shellProps}>
      <MacroMeter label="Calories" value={kcalNow} target={kcalTarget} unit="kcal" direction="ceiling" />
      <MacroMeter label="Protein" value={pNow} target={pTarget} unit="g" direction="floor" />
      <MacroMeter label="Carbs" value={cNow} target={cTarget} unit="g" direction="ceiling" />
      <MacroMeter label="Fat" value={fNow} target={fTarget} unit="g" direction="ceiling" />
      <Row style={{ marginTop: space.s }}>
        <StatTile label="P G/100kcal" value={today?.protein_g_per_100kcal ?? '—'} domain="coaching" />
      </Row>

      <Card style={{ marginTop: space.l }} domain="nutrition">
        <H2>Day So Far</H2>
        <Text style={styles.dayKcal}>{Math.round(kcalNow).toLocaleString('en-US')} kcal</Text>
        <MacroBreakdown
          macros={{ protein: pNow, carbs: cNow, fat: fNow, fiber: fiberNow }}
          kcal={kcalNow}
          swatches
        />
        {dayBand.kcal > 0 ? (
          <View style={styles.dayBand}>
            <Text style={styles.dayBandHead}>{formatBand(dayBand.kcal, dayBand.pct)}</Text>
            <Text style={styles.dayBandSplit}>
              Protein ±{macroBand(dayBand.pct, 'protein')}% · Carbs ±{macroBand(dayBand.pct, 'carbs')}% ·
              Fat ±{macroBand(dayBand.pct, 'fat')}%
            </Text>
          </View>
        ) : null}
      </Card>

      {readOnly ? null : (
      <Card style={{ marginTop: space.l }} domain="nutrition">
        <Row style={{ alignItems: 'baseline' }}>
          {/* heading must not wrap; the hint takes the remaining width */}
          <View style={{ flexShrink: 0 }}>
            <H2>Log food</H2>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.hint}>Fill out what you know, as best you can.</Text>
          </View>
        </Row>
        {canEstimate ? (
          <Pressable
            onPress={estimate}
            disabled={estimating}
            style={({ pressed }) => [styles.estimate, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.estimateText}>
              {estimating
                ? 'Working it out…'
                : shotCount > 0
                  ? `Estimate from ${shotCount === 1 ? 'photo' : 'photos'}`
                  : 'Estimate the calories'}
            </Text>
          </Pressable>
        ) : null}
        {estimateNote ? <Text style={styles.estimateNote}>{estimateNote}</Text> : null}
        <MealComposer
          items={items}
          onItems={setItems}
          macros={mealMacros}
          onMacros={setMealMacros}
          unit={unit}
          onUnit={setUnit}
        />
        <Text style={styles.section}>Photos</Text>
        <PhotoShots shots={shots} onChange={setShots} weight={totalWeight} onWeight={setTotalWeight} />
        <View style={{ height: space.m }} />
        <Button label="Log food" onPress={beginLog} />
        {err ? <Text style={{ color: signal.error, marginTop: space.m, fontSize: font.small }}>{err}</Text> : null}
        <Small>
          No numbers? Name the food and give a weight, then tap Estimate — or log it anyway and
          fill it in later.
        </Small>
      </Card>
      )}

      <H2 domain="nutrition">Today · {date}</H2>
      {entries === null ? (
        <Body muted>loading…</Body>
      ) : entries.length === 0 ? (
        <Body muted>Nothing logged yet.</Body>
      ) : (
        meals.map((m) => (
          <View key={m.key} style={styles.meal}>
            <View style={styles.mealHead}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.mealWhen}>
                  {m.at
                    ? clock12(new Date(m.at).getHours() * 60 + new Date(m.at).getMinutes())
                    : 'earlier'}
                </Text>
                <Text style={styles.mealCount}>
                  {m.rows.length} {m.rows.length === 1 ? 'food' : 'foods'}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.mealTotal}>
                  {m.kcal > 0
                    ? `${Math.round(m.kcal).toLocaleString('en-US')} kcal · ${Math.round(m.protein)}g P`
                    : 'no numbers yet'}
                </Text>
                {m.kcal > 0 ? (
                  <Text style={styles.mealCarbs}>
                    {Math.round(m.carbs)}g C
                    {m.fiber != null && m.fiber > 0
                      ? ` (${Math.round(Math.max(0, m.carbs - m.fiber))}g net)`
                      : ''}
                  </Text>
                ) : null}
              </View>

              {m.at ? (
                <Pressable
                  onPress={() => setAddingTo({ mealId: m.rows[0].meal_id ?? m.key, at: m.at! })}
                  hitSlop={8}
                  style={({ pressed }) => [styles.addToMeal, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.addToMealGlyph}>+</Text>
                </Pressable>
              ) : null}
            </View>

            {m.needsNumbers ? (
              <Pressable
                onPress={() => estimateLogged(m.rows)}
                disabled={busyMeal === m.key}
                style={({ pressed }) => [styles.fillIn, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.fillInText}>
                  {busyMeal === m.key ? 'Working out the numbers…' : 'Estimate the missing numbers'}
                </Text>
              </Pressable>
            ) : null}

            {m.rows.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => setEditingId(e.id)}
                style={({ pressed }) => [styles.entry, pressed && { opacity: 0.85 }]}
              >
                <View style={{ flex: 1 }}>
                  <Body>{e.description}</Body>
                  <Small>
                    {[
                      e.weight_g != null
                        ? `${fromGrams(Number(e.weight_g), unit)}${unitDef(unit).label}`
                        : null,
                      e.qty,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'tap to edit'}
                  </Small>
                </View>
                <Text style={styles.entryKcal}>
                  {e.kcal != null
                    ? `${Math.round(Number(e.kcal))} kcal`
                    : e.status === 'pending'
                      ? 'pending'
                      : '—'}
                </Text>
              </Pressable>
            ))}
          </View>
        ))
      )}

      <EditSheet
        visible={addingTo !== null}
        title="Add A Food To This Meal"
        hint="It lands in the same meal, at the same time. Leave the numbers blank and they get worked out."
        fields={addFields()}
        lock={macroLock}
        onCancel={() => {
          setAddingTo(null);
          setAddShots({});
        }}
        onSave={saveAdded}
        footerTitle="Photos Of This Food"
        footer={<PhotoShots scope="item" shots={addShots} onChange={setAddShots} />}
      />

      <EditSheet
        visible={editing !== null}
        title="Edit This Food"
        hint="Clear a number to take it back off the day. Any three macros fill in the fourth."
        fields={editing ? entryFields(editing) : []}
        lock={macroLock}
        onCancel={() => setEditingId(null)}
        onSave={saveEdit}
        onDelete={removeEntry}
      />

      <InaccuracySheet
        visible={step === 'warn'}
        pct={pending?.pct ?? 0}
        suggestion={
          pending && pending.pct >= SUGGESTION_GATE ? suggestionFor(shapeOf()) : null
        }
        onBack={() => setStep('idle')}
        onContinue={() => setStep('stamp')}
      />

      <TimeStampSheet
        visible={step === 'stamp'}
        stamp={stamp}
        onStamp={setStamp}
        onBack={() => setStep('idle')}
        onContinue={() => setStep('summary')}
      />

      <SummarySheet
        visible={step === 'summary'}
        macros={draft}
        kcal={draftKcal}
        pct={pending?.pct ?? 0}
        onDone={() => {
          setStep('idle');
          void commit();
        }}
      />
    </Shell>
  );
}

const styles = StyleSheet.create({
  // a text input has an intrinsic content width on web; without minWidth: 0 a
  // flex row refuses to shrink it and the second field spills past the card
  inputInRow: { flex: 1, minWidth: 0 },
  meal: {
    backgroundColor: surface.card,
    borderRadius: radius.m,
    padding: space.m,
    marginBottom: space.m,
  },
  mealHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    paddingHorizontal: space.s,
    paddingTop: space.s,
    paddingBottom: space.l,
    marginBottom: space.m,
    borderBottomWidth: 1,
    borderBottomColor: surface.line,
  },
  mealWhen: { color: text.primary, fontSize: font.body, fontWeight: '700' },
  mealCount: { color: text.faint, fontSize: font.micro, marginTop: space.xs },
  mealCarbs: { color: text.muted, fontSize: font.micro, marginTop: space.xs },
  addToMeal: {
    width: 34,
    height: 34,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: domainColor.nutrition,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToMealGlyph: {
    color: domainColor.nutrition,
    fontSize: font.title,
    fontWeight: '700',
    lineHeight: font.title + 2,
  },
  fillIn: {
    borderWidth: 1,
    borderColor: domainColor.nutrition,
    borderRadius: radius.s,
    paddingVertical: space.s,
    alignItems: 'center',
    marginBottom: space.s,
  },
  fillInText: { color: domainColor.nutrition, fontSize: font.micro, fontWeight: '700' },
  mealTotal: { color: text.secondary, fontSize: font.small, fontWeight: '700' },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: surface.field,
    borderRadius: radius.s,
    padding: space.m,
    marginBottom: space.xs,
    gap: space.m,
  },
  entryKcal: { color: domainColor.nutrition, fontSize: font.small, fontWeight: '600' },
  section: { color: text.primary, fontSize: font.body, fontWeight: '700', marginTop: space.l, marginBottom: space.m },
  estimate: {
    marginTop: space.m,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: domainColor.nutrition,
    paddingVertical: space.m,
    alignItems: 'center',
  },
  estimateText: { color: domainColor.nutrition, fontSize: font.small, fontWeight: '700' },
  estimateNote: { color: text.muted, fontSize: font.micro, marginTop: space.s },
  hint: { color: text.muted, fontSize: font.micro, textAlign: 'right' },
  dayKcal: { color: text.secondary, fontSize: font.heading, fontWeight: '700', marginBottom: space.m },
  dayBand: { borderTopWidth: 1, borderTopColor: surface.line, marginTop: space.m, paddingTop: space.m, gap: space.xs },
  dayBandHead: { color: text.secondary, fontSize: font.small, fontWeight: '600' },
  dayBandSplit: { color: text.muted, fontSize: font.micro },
  entryWhen: { color: text.faint, fontSize: font.micro },
});
