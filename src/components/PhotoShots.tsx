import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { surface, text, space, font, radius, domainColor, signal } from '../theme';
import { pickPhoto, photosSupported, PickedPhoto } from '../lib/photos';
import { topDownGraphic, angleGraphic, labelGraphic } from './shotGraphics';
import { EditSheet } from './EditSheet';

/**
 * The two-shot protocol from the spec: straight down, then ~45 degrees with a
 * utensil in frame for scale. Two slots, not a free-for-all, so the estimator
 * gets consistent inputs.
 */
export type Shot = 'top' | 'angle' | 'label';

type SlotSpec = { key: Shot; label: string; hint: string; art: string };

/**
 * Who the shots are of: the whole plate, or one food inside it.
 *
 * Same three slots either way — a food added on its own gets photographed the
 * same way a meal does, because the estimator asks the same question of both.
 * Only the wording narrows.
 */
export type ShotScope = 'meal' | 'item';

/** the two-shot protocol */
const MEAL_SLOTS: (scope: ShotScope) => SlotSpec[] = (scope) => [
  {
    key: 'top',
    label: 'Straight Down',
    hint: scope === 'item' ? 'directly above this food' : 'directly above the plate',
    art: topDownGraphic,
  },
  { key: 'angle', label: 'About 45°', hint: 'utensil in frame for scale', art: angleGraphic },
];

/** optional, and worth far more than a guess when the food is packaged */
const LABEL_SLOT: SlotSpec = {
  key: 'label',
  label: 'Nutrition Label',
  hint: 'optional — the panel on the packet, straight on',
  art: labelGraphic,
};

export function PhotoShots({
  shots,
  onChange,
  weight,
  onWeight,
  scope = 'meal',
}: {
  shots: Partial<Record<Shot, PickedPhoto>>;
  onChange: (next: Partial<Record<Shot, PickedPhoto>>) => void;
  /**
   * Grams of food on the plate, if it was weighed. Omit both of these and the
   * weight block disappears — inside the add-a-food sheet the weight is already
   * one of the fields above, and asking twice would be two answers for one
   * number.
   */
  weight?: string;
  onWeight?: (v: string) => void;
  scope?: ShotScope;
}) {
  const [busy, setBusy] = React.useState<Shot | null>(null);
  const [openWeight, setOpenWeight] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function take(slot: Shot) {
    setErr(null);
    setBusy(slot);
    try {
      const photo = await pickPhoto();
      if (photo) onChange({ ...shots, [slot]: photo });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'could not read that photo');
    } finally {
      setBusy(null);
    }
  }

  function clear(slot: Shot) {
    const next = { ...shots };
    delete next[slot];
    onChange(next);
  }

  if (!photosSupported()) {
    return <Text style={styles.note}>Photo capture isn&apos;t available on this platform yet.</Text>;
  }

  function slot(spec: SlotSpec, wide = false) {
    const photo = shots[spec.key];
    return (
      <Pressable
        key={spec.key}
        onPress={() => (photo ? clear(spec.key) : take(spec.key))}
        style={({ pressed }) => [
          styles.slot,
          wide && styles.slotWide,
          photo && styles.slotFilled,
          pressed && { opacity: 0.85 },
        ]}
      >
        {photo ? (
          <>
            <Image source={{ uri: photo.uri }} style={styles.thumb} resizeMode="cover" />
            <View style={styles.clearBadge}>
              <Text style={styles.clearGlyph}>×</Text>
            </View>
          </>
        ) : busy === spec.key ? (
          <ActivityIndicator color={text.secondary} />
        ) : (
          <>
            {/* graphic on top, words underneath */}
            <Image
              source={{ uri: spec.art }}
              style={wide ? styles.artWide : styles.art}
              resizeMode="contain"
            />
            <Text style={styles.slotLabel}>{spec.label}</Text>
            <Text style={styles.slotHint}>{spec.hint}</Text>
          </>
        )}
      </Pressable>
    );
  }

  const asksWeight = onWeight != null;

  return (
    <View>
      <View style={styles.row}>{MEAL_SLOTS(scope).map((s) => slot(s))}</View>
      <View style={{ height: space.m }} />
      {slot(LABEL_SLOT, true)}
      {asksWeight ? (
        <>
          <Text style={styles.weightLabel}>Weighed It?</Text>
          <Pressable
            onPress={() => setOpenWeight(true)}
            style={({ pressed }) => [styles.weightRow, pressed && { opacity: 0.85 }]}
          >
            <Text style={[styles.weightValue, !weight && styles.weightEmpty]}>
              {weight ? `${weight} g` : 'Tap To Add'}
            </Text>
            <Text style={styles.weightHint}>
              Everything on the plate, food only — tare the dish first. A real number here
              anchors the whole estimate.
            </Text>
          </Pressable>

          <EditSheet
            visible={openWeight}
            title="Weight Of The Food"
            hint="Grams, food only, with the plate or bowl tared out. Leave blank if you didn’t weigh it."
            fields={[
              { key: 'weight', label: 'Total Grams', value: weight ?? '', numeric: true, placeholder: 'e.g. 420' },
            ]}
            onCancel={() => setOpenWeight(false)}
            onSave={(v) => {
              onWeight?.(v.weight ?? '');
              setOpenWeight(false);
            }}
          />
        </>
      ) : null}
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <Text style={styles.note}>
        Shrunk and stripped of location data before they leave your phone.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.m },
  slot: {
    flex: 1,
    minWidth: 0,
    aspectRatio: 0.786, // 1/phi upright — room for the graphic above the words
    borderRadius: radius.m,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: surface.line,
    backgroundColor: surface.field,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: space.m,
  },
  slotWide: { aspectRatio: 2.618 }, // phi squared, laid out landscape
  slotFilled: { borderStyle: 'solid', borderColor: domainColor.nutrition, padding: 0 },
  // percentage heights collapse inside an aspect-ratio box; let flex size it
  art: { width: '100%', flexGrow: 1, flexShrink: 1, minHeight: 34, marginBottom: space.s },
  artWide: { width: '100%', flexGrow: 1, flexShrink: 1, minHeight: 30, marginBottom: space.xs },
  thumb: { width: '100%', height: '100%' },
  clearBadge: {
    position: 'absolute',
    top: space.s,
    right: space.s,
    width: 21,
    height: 21,
    borderRadius: radius.pill,
    backgroundColor: surface.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearGlyph: { color: text.secondary, fontSize: font.small, lineHeight: 16 },
  slotLabel: { color: text.primary, fontSize: font.small, fontWeight: '700', textAlign: 'center' },
  // directions are instructions, not chrome — they read at the same weight as the label
  slotHint: { color: text.secondary, fontSize: font.small, textAlign: 'center', marginTop: space.xs },
  note: { color: text.faint, fontSize: font.micro, marginTop: space.m },
  weightLabel: { color: text.primary, fontSize: font.body, fontWeight: '700', marginTop: space.l, marginBottom: space.m },
  weightRow: { flexDirection: 'row', gap: space.m, alignItems: 'center' },
  weightValue: {
    backgroundColor: surface.field,
    color: text.primary,
    borderRadius: radius.s,
    padding: space.m,
    fontSize: font.body,
    fontWeight: '700',
    minWidth: 110,
    textAlign: 'center',
  },
  weightEmpty: { color: text.faint, fontWeight: '400' },
  weightHint: { color: text.muted, flex: 1, minWidth: 0, fontSize: font.micro },
  err: { color: signal.error, fontSize: font.small, marginTop: space.m },
});
