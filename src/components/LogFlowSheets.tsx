import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { surface, text, space, font, radius, layout, accent } from '../theme';
import { MacroPie, macroSlices, MACRO_HUE, MacroKeyName } from './MacroPie';
import { macroBand, formatBand } from '../lib/inaccuracy';

/* ------------------------------------------------------------------ */
/* shared chrome                                                       */
/* ------------------------------------------------------------------ */

function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={styles.sheet}>{children}</View>
      </View>
    </Modal>
  );
}

function Actions({
  backLabel,
  onBack,
  nextLabel,
  onNext,
}: {
  backLabel?: string;
  onBack?: () => void;
  nextLabel: string;
  onNext: () => void;
}) {
  return (
    <View style={styles.actions}>
      {onBack ? (
        <Pressable onPress={onBack} style={({ pressed }) => [styles.ghost, pressed && { opacity: 0.7 }]}>
          <Text style={styles.ghostText}>{backLabel ?? 'Go back'}</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={onNext} style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}>
        <Text style={styles.primaryText}>{nextLabel}</Text>
      </Pressable>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 1. inaccuracy warning                                               */
/* ------------------------------------------------------------------ */

export function InaccuracySheet({
  visible,
  pct,
  suggestion,
  onBack,
  onContinue,
}: {
  visible: boolean;
  pct: number;
  suggestion: { text: string; to: number } | null;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onBack}>
      <Text style={styles.title}>Before you log this</Text>
      <Text style={styles.body}>
        The more information you provide, the more accurate the results will be. We estimate{' '}
        <Text style={styles.strong}>±{pct}%</Text> inaccuracy.
      </Text>
      {suggestion ? (
        <Text style={styles.suggestion}>
          {suggestion.text} — that would bring this to ±{suggestion.to}%.
        </Text>
      ) : null}
      <Actions onBack={onBack} nextLabel="Continue" onNext={onContinue} />
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* 2. time stamp                                                       */
/* ------------------------------------------------------------------ */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const STEP_MIN = 15;

/** 0..1439 -> "7:45 AM" */
export function clock12(mins: number): string {
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** a tappable pill that opens a scrollable option list — no picker dependency */
function OptionPill<T extends string | number>({
  label,
  value,
  options,
  labels,
  onPick,
  flex,
}: {
  label: string;
  value: T;
  options: T[];
  labels?: string[];
  onPick: (v: T) => void;
  flex?: number;
}) {
  const [open, setOpen] = useState(false);
  const shown = labels ? labels[options.indexOf(value)] : String(value);
  return (
    <View style={{ flex: flex ?? 1, minWidth: 0 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable onPress={() => setOpen(true)} style={({ pressed }) => [styles.pill, pressed && { opacity: 0.8 }]}>
        <Text style={styles.pillText} numberOfLines={1}>
          {shown}
        </Text>
        <Text style={styles.caret}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setOpen(false)}>
          <Pressable style={styles.list} onPress={() => {}}>
            <Text style={styles.title}>{label}</Text>
            <ScrollView style={styles.listBody}>
              {options.map((o, i) => {
                const selected = o === value;
                return (
                  <Pressable
                    key={String(o)}
                    onPress={() => {
                      onPick(o);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      selected && styles.optionOn,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextOn]}>
                      {labels ? labels[i] : String(o)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export type Stamp = { year: number; month: number; day: number; minutes: number };

/** current time, snapped to the nearest quarter hour without crossing midnight */
export function nowStamp(): Stamp {
  const d = new Date();
  const snapped = Math.round((d.getHours() * 60 + d.getMinutes()) / STEP_MIN) * STEP_MIN;
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
    minutes: Math.min(snapped, 24 * 60 - STEP_MIN),
  };
}

/** stamp -> an ISO instant in the device's own zone, for `food_log_entries.at` */
export function stampToISO(s: Stamp): string {
  return new Date(s.year, s.month, s.day, Math.floor(s.minutes / 60), s.minutes % 60, 0, 0).toISOString();
}

export function TimeStampSheet({
  visible,
  stamp,
  onStamp,
  onBack,
  onContinue,
}: {
  visible: boolean;
  stamp: Stamp;
  onStamp: (s: Stamp) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const daysInMonth = new Date(stamp.year, stamp.month + 1, 0).getDate();
  const y0 = new Date().getFullYear();
  const times = Array.from({ length: (24 * 60) / STEP_MIN }, (_, i) => i * STEP_MIN);

  // a month or year change can strand the day (Jan 31 -> Feb)
  useEffect(() => {
    if (stamp.day > daysInMonth) onStamp({ ...stamp, day: daysInMonth });
  }, [daysInMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Sheet visible={visible} onClose={onBack}>
      <Text style={styles.title}>Time stamp</Text>

      <View style={styles.dateRow}>
        <OptionPill
          label="Month"
          value={stamp.month}
          options={MONTHS.map((_, i) => i)}
          labels={MONTHS}
          onPick={(month) => onStamp({ ...stamp, month })}
          flex={1.5}
        />
        <OptionPill
          label="Day"
          value={stamp.day}
          options={Array.from({ length: daysInMonth }, (_, i) => i + 1)}
          onPick={(day) => onStamp({ ...stamp, day })}
        />
        <OptionPill
          label="Year"
          value={stamp.year}
          options={[y0 - 1, y0, y0 + 1]}
          onPick={(year) => onStamp({ ...stamp, year })}
          flex={1.2}
        />
      </View>

      <View style={{ marginTop: space.l }}>
        <OptionPill
          label="Time"
          value={stamp.minutes}
          options={times}
          labels={times.map(clock12)}
          onPick={(minutes) => onStamp({ ...stamp, minutes })}
        />
      </View>

      <Text style={styles.faint}>
        Times step in 15 minutes. Changing the date moves this meal into that day's totals.
      </Text>

      <Actions onBack={onBack} nextLabel="Continue" onNext={onContinue} />
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* 3. summary                                                          */
/* ------------------------------------------------------------------ */

export function MacroBreakdown({
  macros,
  kcal,
  swatches,
}: {
  macros: { protein: number; carbs: number; fat: number };
  kcal: number;
  swatches?: boolean;
}) {
  const { slices, kcalOf } = macroSlices(macros);
  return (
    <View>
      {slices.map((s) => (
        <View key={s.key} style={styles.macroRow}>
          <View style={styles.macroNameCell}>
            {swatches ? (
              <View style={[styles.swatch, { backgroundColor: MACRO_HUE[s.key as MacroKeyName] }]} />
            ) : null}
            <Text style={styles.macroName}>{s.label}</Text>
          </View>
          <Text style={styles.macroG}>{Math.round(macros[s.key as MacroKeyName])}g</Text>
          <Text style={styles.macroKcal}>{Math.round(kcalOf[s.key as MacroKeyName])} kcal</Text>
          <Text style={styles.macroPct}>({kcal ? Math.round(s.pct) : 0}% of kcal)</Text>
        </View>
      ))}
    </View>
  );
}

export function SummarySheet({
  visible,
  macros,
  kcal,
  pct,
  onDone,
}: {
  visible: boolean;
  macros: { protein: number; carbs: number; fat: number };
  kcal: number;
  pct: number;
  onDone: () => void;
}) {
  const { slices } = macroSlices(macros);
  return (
    <Sheet visible={visible} onClose={onDone}>
      <Text style={styles.title}>Logged</Text>
      <View style={styles.sumHead}>
        <Text style={styles.bigKcal}>{Math.round(kcal).toLocaleString('en-US')} kcal</Text>
        <MacroPie slices={slices} />
      </View>
      <MacroBreakdown macros={macros} kcal={kcal} swatches />
      <View style={styles.band}>
        <Text style={styles.bandHead}>{formatBand(kcal, pct)}</Text>
        <Text style={styles.bandSplit}>
          Protein ±{macroBand(pct, 'protein')}% · Carbs ±{macroBand(pct, 'carbs')}% · Fat ±
          {macroBand(pct, 'fat')}%
        </Text>
      </View>
      <Actions nextLabel="Done" onNext={onDone} />
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(7,24,41,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.l,
  },
  sheet: {
    width: '100%',
    maxWidth: layout.content,
    maxHeight: '90%',
    backgroundColor: surface.card,
    borderRadius: radius.l,
    borderWidth: 2,
    borderColor: surface.edge,
    padding: space.xl,
  },
  list: {
    width: '100%',
    maxWidth: layout.content,
    maxHeight: '70%',
    backgroundColor: surface.card,
    borderRadius: radius.l,
    borderWidth: 2,
    borderColor: surface.edge,
    padding: space.l,
  },
  listBody: { marginTop: space.m },
  option: { paddingVertical: space.l, paddingHorizontal: space.m, borderRadius: radius.s },
  optionOn: { backgroundColor: surface.field },
  optionText: { color: text.muted, fontSize: font.body },
  optionTextOn: { color: text.primary, fontWeight: '700' },

  title: { color: text.primary, fontSize: font.title, fontWeight: '700' },
  body: { color: text.secondary, fontSize: font.small, marginTop: space.l, lineHeight: 21 },
  strong: { color: text.primary, fontWeight: '700' },
  suggestion: {
    color: text.primary,
    fontSize: font.small,
    marginTop: space.l,
    paddingLeft: space.m,
    borderLeftWidth: 3,
    borderLeftColor: accent.bloodOrange,
    lineHeight: 21,
  },
  faint: { color: text.faint, fontSize: font.micro, marginTop: space.l },

  dateRow: { flexDirection: 'row', gap: space.m, marginTop: space.l },
  fieldLabel: { color: text.muted, fontSize: font.micro, fontWeight: '700', marginBottom: space.xs },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.s,
    backgroundColor: surface.field,
    borderRadius: radius.s,
    paddingVertical: space.l,
    paddingHorizontal: space.m,
  },
  pillText: { color: text.primary, fontSize: font.small, fontWeight: '700', flexShrink: 1 },
  caret: { color: text.muted, fontSize: font.micro },

  sumHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.l,
    marginTop: space.l,
    marginBottom: space.l,
    flexWrap: 'wrap',
  },
  bigKcal: { color: text.secondary, fontSize: font.heading, fontWeight: '700', flexShrink: 1 },

  macroRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.xs },
  macroNameCell: { flexDirection: 'row', alignItems: 'center', gap: space.s, width: 88 },
  swatch: { width: 8, height: 8, borderRadius: 2 },
  macroName: { color: text.muted, fontSize: font.small },
  macroG: { color: text.primary, fontSize: font.small, width: 44, textAlign: 'right' },
  macroKcal: { color: text.primary, fontSize: font.small, width: 68, textAlign: 'right' },
  macroPct: { color: text.muted, fontSize: font.small, flex: 1, textAlign: 'right' },

  band: {
    borderTopWidth: 1,
    borderTopColor: surface.line,
    marginTop: space.l,
    paddingTop: space.m,
    gap: space.xs,
  },
  bandHead: { color: text.secondary, fontSize: font.small, fontWeight: '600' },
  bandSplit: { color: text.muted, fontSize: font.micro },

  actions: { flexDirection: 'row', gap: space.m, marginTop: space.xl },
  ghost: {
    flex: 1,
    paddingVertical: space.l,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: surface.edge,
    alignItems: 'center',
  },
  ghostText: { color: text.muted, fontSize: font.body, fontWeight: '700' },
  primary: {
    flex: 2,
    paddingVertical: space.l,
    borderRadius: radius.m,
    backgroundColor: text.primary,
    alignItems: 'center',
  },
  primaryText: { color: surface.field, fontSize: font.body, fontWeight: '700' },
});
