import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { surface, text, space, font, radius, domainColor } from '../theme';
import type { MealItemInput } from '../data';
import { EditSheet, SheetField, SheetLock } from './EditSheet';
import { PhotoShots, Shot } from './PhotoShots';
import type { PickedPhoto } from '../lib/photos';
import {
  WeightUnit,
  WEIGHT_UNITS,
  UNITS_ENABLED,
  unitDef,
  toGrams,
  gramEcho,
  convertDisplay,
} from '../lib/units';

export type DraftItem = {
  key: string;
  description: string;
  qty: string;
  /** typed in whatever unit is on screen; grams are derived, never stored here */
  weight: string;
  open: boolean;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  /**
   * Shots of this one food. Separate from the meal's own two-shot set: a photo
   * of the chicken is a better question to ask about the chicken than a photo
   * of the whole plate is.
   */
  shots: Partial<Record<Shot, PickedPhoto>>;
};

export type MealMacros = { kcal: string; protein: string; carbs: string; fat: string };

export const emptyItem = (key: string): DraftItem => ({
  key,
  description: '',
  qty: '',
  weight: '',
  open: false,
  kcal: '',
  protein: '',
  carbs: '',
  fat: '',
  shots: {},
});

export const emptyMacros = (): MealMacros => ({ kcal: '', protein: '', carbs: '', fat: '' });

const num = (s: string): number | undefined => {
  const v = Number(s.trim());
  return s.trim() === '' || Number.isNaN(v) ? undefined : v;
};

export type MacroKey = 'kcal' | 'protein' | 'carbs' | 'fat';
export type Derived = { field: MacroKey; value: string } | { field: 'none'; inconsistent: boolean };
export type MacroSet = Record<MacroKey, string>;

/**
 * Atwater: protein and carbs are 4 kcal per gram, fat is 9. Given any three of
 * the four, the fourth follows — so once three are filled we complete the set
 * rather than making someone do arithmetic they already implied.
 *
 * Approximate by nature: fibre and sugar alcohols carry less than 4 and the
 * factors vary by food. So a derived number is shown as derived, and anything
 * typed over it wins.
 *
 * A solve that comes out negative means the four don't reconcile — say so
 * rather than writing a nonsense number into the log.
 */
export function derive(raw: MacroSet): Derived {
  const v = {
    kcal: num(raw.kcal),
    protein: num(raw.protein),
    carbs: num(raw.carbs),
    fat: num(raw.fat),
  };
  const missing = (Object.keys(v) as MacroKey[]).filter((k) => v[k] == null);
  if (missing.length !== 1) return { field: 'none', inconsistent: false };

  const gap = missing[0];
  let out: number;
  if (gap === 'kcal') out = v.protein! * 4 + v.carbs! * 4 + v.fat! * 9;
  else if (gap === 'fat') out = (v.kcal! - v.protein! * 4 - v.carbs! * 4) / 9;
  else if (gap === 'protein') out = (v.kcal! - v.carbs! * 4 - v.fat! * 9) / 4;
  else out = (v.kcal! - v.protein! * 4 - v.fat! * 9) / 4;

  if (!Number.isFinite(out) || out < 0) return { field: 'none', inconsistent: true };
  return { field: gap, value: String(Math.round(out)) };
}

/** What a set is actually worth once the missing value is filled in. */
export function effective(raw: MacroSet): MacroSet {
  const d = derive(raw);
  return d.field === 'none' ? raw : { ...raw, [d.field]: d.value };
}

const setOf = (o: { kcal: string; protein: string; carbs: string; fat: string }): MacroSet => ({
  kcal: o.kcal,
  protein: o.protein,
  carbs: o.carbs,
  fat: o.fat,
});

/** Per-item macros win when any were entered; otherwise the meal block applies. */
export function toMealItems(items: DraftItem[], unit: WeightUnit = 'g'): MealItemInput[] {
  return items
    .filter((i) => i.description.trim())
    .map((i) => ({
      description: i.description,
      qty: i.qty,
      weightG: toGrams(i.weight, unit),
      enteredValue: i.weight.trim() ? Number(i.weight) : null,
      enteredUnit: i.weight.trim() ? unit : null,
      ...(() => {
        const e = effective(setOf(i));
        return {
          kcal: num(e.kcal),
          protein_g: num(e.protein),
          carbs_g: num(e.carbs),
          fat_g: num(e.fat),
        };
      })(),
    }));
}

export function toMealMacros(m: MealMacros) {
  const e = effective(setOf(m));
  return { kcal: num(e.kcal), protein_g: num(e.protein), carbs_g: num(e.carbs), fat_g: num(e.fat) };
}

/** Sum of whatever per-item macros have been filled in. */
function itemTotals(items: DraftItem[]) {
  const rows = items.map((i) => effective(setOf(i)));
  const sum = (k: MacroKey) => rows.reduce((acc, r) => acc + (num(r[k]) ?? 0), 0);
  const any = rows.some((r) => (Object.keys(r) as MacroKey[]).some((k) => num(r[k]) != null));
  return any ? { any, kcal: sum('kcal'), p: sum('protein'), c: sum('carbs'), f: sum('fat') } : null;
}

export function MealComposer({
  items,
  onItems,
  macros,
  onMacros,
  unit,
  onUnit,
}: {
  items: DraftItem[];
  onItems: (next: DraftItem[]) => void;
  macros: MealMacros;
  onMacros: (next: MealMacros) => void;
  unit: WeightUnit;
  onUnit: (u: WeightUnit) => void;
}) {
  const totals = itemTotals(items);

  function patch(key: string, patchObj: Partial<DraftItem>) {
    onItems(items.map((i) => (i.key === key ? { ...i, ...patchObj } : i)));
  }

  const [openItem, setOpenItem] = useState<string | null>(null);
  const [openMeal, setOpenMeal] = useState(false);
  /**
   * Photos are held here while the sheet is open rather than written straight
   * onto the item, so Cancel discards them the same way it discards typing.
   */
  const [draftShots, setDraftShots] = useState<Partial<Record<Shot, PickedPhoto>>>({});

  const macroSummary = (m: MacroSet) => {
    const e = effective(m);
    const parts = [
      e.kcal ? `${e.kcal} kcal` : null,
      e.protein ? `${e.protein}P` : null,
      e.carbs ? `${e.carbs}C` : null,
      e.fat ? `${e.fat}F` : null,
    ].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'No Macros Yet';
  };

  const itemFields = (i: DraftItem): SheetField[] => [
    { key: 'description', label: 'Food', value: i.description, placeholder: 'what was it?' },
    { key: 'qty', label: 'How Much (words)', value: i.qty, placeholder: '1 bowl, 2 scoops — no numbers needed' },
    {
      key: 'weight',
      label: 'Weight',
      value: i.weight,
      numeric: true,
      placeholder: 'on a scale, if you have one',
      echo: (d) => gramEcho(d.weight ?? '', unit),
      units: UNITS_ENABLED
        ? {
            value: unit,
            options: WEIGHT_UNITS.map((u) => ({ key: u.key, label: u.label })),
            convert: (v, from, to) => convertDisplay(v, from as WeightUnit, to as WeightUnit),
            onChange: (next) => onUnit(next as WeightUnit),
          }
        : undefined,
    },
    { key: 'kcal', label: 'Calories', value: i.kcal, numeric: true, half: true },
    { key: 'protein', label: 'Protein (g)', value: i.protein, numeric: true, half: true },
    { key: 'carbs', label: 'Carbs (g)', value: i.carbs, numeric: true, half: true },
    { key: 'fat', label: 'Fat (g)', value: i.fat, numeric: true, half: true },
  ];

  /**
   * Three of the four filled means the fourth is known. We fill it and lock it
   * rather than letting someone type a set that contradicts itself — which is
   * also why there is no "your numbers don't add up" state to design.
   */
  const macroLock: SheetLock = (d) => {
    const out = derive({
      kcal: d.kcal ?? '',
      protein: d.protein ?? '',
      carbs: d.carbs ?? '',
      fat: d.fat ?? '',
    });
    return out.field === 'none' ? null : { key: out.field, value: out.value };
  };

  const editing = items.find((i) => i.key === openItem) ?? null;

  return (
    <View>
      <Text style={styles.section}>What Did You Eat?</Text>

      {items.map((item, idx) => (
        <Pressable
          key={item.key}
          onPress={() => {
            setDraftShots(item.shots ?? {});
            setOpenItem(item.key);
          }}
          style={({ pressed }) => [styles.itemBlock, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.itemRow}>
            <Text style={[styles.itemName, !item.description && styles.itemEmpty]} numberOfLines={1}>
              {item.description || (idx === 0 ? 'Add A Food' : 'And…')}
            </Text>
            {item.weight ? (
              <Text style={styles.itemQty}>
                {item.weight}
                {unitDef(unit).label}
              </Text>
            ) : item.qty ? (
              <Text style={styles.itemQty}>{item.qty}</Text>
            ) : null}
            {items.length > 1 ? (
              <Pressable
                onPress={() => onItems(items.filter((i) => i.key !== item.key))}
                hitSlop={8}
                style={styles.iconBtn}
              >
                <Text style={styles.iconGlyph}>×</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.itemMacros}>
            {macroSummary(setOf(item))}
            {Object.keys(item.shots ?? {}).length > 0 ? (
              <Text style={styles.itemShots}>
                {'  ·  '}
                {Object.keys(item.shots).length} photo
                {Object.keys(item.shots).length === 1 ? '' : 's'}
              </Text>
            ) : null}
          </Text>
        </Pressable>
      ))}

      <Pressable
        onPress={() => {
          const key = `i${Date.now()}`;
          onItems([...items, emptyItem(key)]);
          setDraftShots({});
          setOpenItem(key);
        }}
        style={({ pressed }) => [styles.addItem, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.addItemText}>＋ Another Item</Text>
      </Pressable>

      <Text style={styles.section}>
        Macros{totals ? ' — From The Items Above' : ' For The Whole Meal'}
      </Text>
      {totals ? (
        <View style={styles.totals}>
          <Text style={styles.totalsText}>
            {Math.round(totals.kcal)} kcal · {Math.round(totals.p)}P · {Math.round(totals.c)}C ·{' '}
            {Math.round(totals.f)}F
          </Text>
          <Text style={styles.totalsHint}>Per-Item Numbers Are Being Used</Text>
        </View>
      ) : (
        <Pressable
          onPress={() => setOpenMeal(true)}
          style={({ pressed }) => [styles.totals, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.totalsText}>{macroSummary(setOf(macros))}</Text>
          <Text style={styles.totalsHint}>Tap To Enter</Text>
        </Pressable>
      )}

      <EditSheet
        visible={editing !== null}
        title="This Item"
        hint="Fill in what you know. Enter any three of the four macros and the fourth is worked out."
        fields={editing ? itemFields(editing) : []}
        lock={macroLock}
        onCancel={() => setOpenItem(null)}
        onSave={(v) => {
          patch(editing!.key, {
            description: v.description ?? '',
            qty: v.qty ?? '',
            weight: v.weight ?? '',
            kcal: v.kcal ?? '',
            protein: v.protein ?? '',
            carbs: v.carbs ?? '',
            fat: v.fat ?? '',
            shots: draftShots,
          });
          setOpenItem(null);
        }}
        footerTitle="Photos Of This Food"
        footer={<PhotoShots scope="item" shots={draftShots} onChange={setDraftShots} />}
      />

      <EditSheet
        visible={openMeal}
        title="Macros For The Whole Meal"
        hint="Any three of the four is enough — the fourth is calculated."
        fields={[
          { key: 'kcal', label: 'Calories', value: macros.kcal, numeric: true, half: true },
          { key: 'protein', label: 'Protein (g)', value: macros.protein, numeric: true, half: true },
          { key: 'carbs', label: 'Carbs (g)', value: macros.carbs, numeric: true, half: true },
          { key: 'fat', label: 'Fat (g)', value: macros.fat, numeric: true, half: true },
        ]}
        lock={macroLock}
        onCancel={() => setOpenMeal(false)}
        onSave={(v) => {
          onMacros({
            kcal: v.kcal ?? '',
            protein: v.protein ?? '',
            carbs: v.carbs ?? '',
            fat: v.fat ?? '',
          });
          setOpenMeal(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { color: text.primary, fontSize: font.body, fontWeight: '700', marginBottom: space.m, marginTop: space.m },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.m },
  seg: { flexDirection: 'row', backgroundColor: surface.field, borderRadius: radius.s, overflow: 'hidden' },
  segBtn: { paddingVertical: space.s, paddingHorizontal: space.l },
  segBtnOn: { backgroundColor: surface.line },
  segText: { color: text.faint, fontSize: font.small, fontWeight: '600' },
  segTextOn: { color: text.primary, fontWeight: '700' },
  itemBlock: {
    backgroundColor: surface.field,
    borderRadius: radius.s,
    padding: space.l,
    marginBottom: space.m,
  },
  itemRow: { flexDirection: 'row', gap: space.m, alignItems: 'center' },
  itemName: { color: text.primary, fontSize: font.body, fontWeight: '700', flex: 1, minWidth: 0 },
  itemEmpty: { color: text.faint, fontWeight: '400' },
  itemQty: { color: text.muted, fontSize: font.small },
  itemMacros: { color: text.muted, fontSize: font.small, marginTop: space.s },
  itemShots: { color: domainColor.nutrition, fontSize: font.small, fontWeight: '700' },
  iconBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  iconGlyph: { color: text.muted, fontSize: font.body },
  addItem: { paddingVertical: space.s },
  addItemText: { color: domainColor.nutrition, fontSize: font.small, fontWeight: '600' },
  totals: {
    backgroundColor: surface.field,
    borderRadius: radius.s,
    padding: space.m,
  },
  totalsText: { color: text.primary, fontSize: font.body, fontWeight: '700' },
  totalsHint: { color: text.faint, fontSize: font.micro, marginTop: space.xs },
});
