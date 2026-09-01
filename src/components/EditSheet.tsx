import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { surface, text, space, font, radius, layout, signal } from '../theme';

export type SheetField = {
  key: string;
  label: string;
  value: string;
  numeric?: boolean;
  placeholder?: string;
  /** render two per row instead of one full-width */
  half?: boolean;
  /** small line under the field — the gram echo on an oz input */
  echo?: (draft: Record<string, string>) => string;
  /**
   * a unit picker sitting on this field's label. Switching converts the value
   * that is already typed, so the unit is chosen while looking at the number
   * rather than before you have one.
   */
  units?: {
    value: string;
    options: { key: string; label: string }[];
    convert: (value: string, from: string, to: string) => string;
    onChange: (next: string) => void;
  };
};

/**
 * Given the live draft, which field is calculated and what it holds.
 * Three of four macros filled means the fourth is known, so we fill it and
 * lock it rather than inviting someone to type a number that disagrees.
 */
export type SheetLock = (draft: Record<string, string>) => { key: string; value: string } | null;

/**
 * Fields open a sheet instead of taking a caret inline.
 *
 * On a phone an inline field is a small target and the keyboard covers the rest
 * of the form, so you type blind. A sheet gives one thing at a time, big enough
 * to hit, with the values you already entered still visible above the keyboard.
 * Cancel discards; nothing is committed until Save.
 */
export function EditSheet({
  visible,
  title,
  hint,
  fields,
  lock,
  onCancel,
  onSave,
  onDelete,
  deleteLabel,
}: {
  visible: boolean;
  title: string;
  hint?: string;
  fields: SheetField[];
  lock?: SheetLock;
  onCancel: () => void;
  onSave: (values: Record<string, string>) => void;
  /** shown only when editing something that already exists */
  onDelete?: () => void;
  deleteLabel?: string;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const locked = lock ? lock(draft) : null;

  // reopening always starts from what is currently stored, never from the last edit
  useEffect(() => {
    if (visible) {
      setDraft(Object.fromEntries(fields.map((f) => [f.key, f.value])));
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.scrim} onPress={onCancel}>
        {/* swallow taps inside the sheet so they don't dismiss it */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            <View style={styles.grid}>
              {fields.map((f) => {
                const isLocked = locked?.key === f.key;
                const echo = f.echo ? f.echo(draft) : '';
                return (
                  <View key={f.key} style={[styles.fieldWrap, f.half && styles.fieldHalf]}>
                    <View style={styles.labelRow}>
                      <Text style={styles.label}>
                        {f.label}
                        {isLocked ? <Text style={styles.calc}> · calculated</Text> : null}
                      </Text>
                      {f.units ? (
                        <View style={styles.seg}>
                          {f.units.options.map((u) => {
                            const on = u.key === f.units!.value;
                            return (
                              <Pressable
                                key={u.key}
                                onPress={() => {
                                  if (on) return;
                                  const from = f.units!.value;
                                  setDraft((d) => ({
                                    ...d,
                                    [f.key]: f.units!.convert(d[f.key] ?? '', from, u.key),
                                  }));
                                  f.units!.onChange(u.key);
                                }}
                                style={[styles.segBtn, on && styles.segBtnOn]}
                              >
                                <Text style={[styles.segText, on && styles.segTextOn]}>{u.label}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      ) : null}
                    </View>
                    <TextInput
                      style={[styles.input, isLocked && styles.inputLocked]}
                      value={isLocked ? locked!.value : draft[f.key] ?? ''}
                      onChangeText={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
                      placeholder={f.placeholder}
                      placeholderTextColor={text.faint}
                      keyboardType={f.numeric ? 'numeric' : 'default'}
                      editable={!isLocked}
                      autoFocus={f === fields[0]}
                    />
                    {echo ? <Text style={styles.echo}>{echo}</Text> : null}
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {onDelete ? (
            <Pressable
              onPress={onDelete}
              style={({ pressed }) => [styles.destroy, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.destroyText}>{deleteLabel ?? 'Remove this food'}</Text>
            </Pressable>
          ) : null}

          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.7 }]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onSave(locked ? { ...draft, [locked.key]: locked.value } : draft)}
              style={({ pressed }) => [styles.save, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.saveText}>Done</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.l,
  },
  sheet: {
    width: '100%',
    maxWidth: layout.content,
    maxHeight: '85%',
    backgroundColor: surface.card,
    borderRadius: radius.l,
    borderWidth: 2,
    borderColor: surface.edge,
    padding: space.xl,
  },
  title: { color: text.primary, fontSize: font.title, fontWeight: '700' },
  hint: { color: text.muted, fontSize: font.small, marginTop: space.s },
  body: { marginTop: space.l },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m },
  fieldWrap: { width: '100%' },
  fieldHalf: { flexGrow: 1, flexBasis: '45%', minWidth: 0 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.m,
    marginBottom: space.s,
  },
  label: { color: text.primary, fontSize: font.small, fontWeight: '700' },
  seg: { flexDirection: 'row', backgroundColor: surface.field, borderRadius: radius.s, overflow: 'hidden' },
  segBtn: { paddingVertical: space.xs, paddingHorizontal: space.m },
  segBtnOn: { backgroundColor: surface.line },
  segText: { color: text.faint, fontSize: font.micro, fontWeight: '700' },
  segTextOn: { color: text.primary },
  input: {
    backgroundColor: surface.field,
    color: text.primary,
    borderRadius: radius.s,
    padding: space.l,
    fontSize: font.title,
  },
  // 7.27:1 on the field, against 10.99:1 for a live one — recessed, still
  // readable. text.faint sits at 3.72:1 and fails for a number you have to read.
  inputLocked: { color: text.muted },
  calc: { color: text.faint, fontSize: font.micro, fontWeight: '400' },
  echo: { color: text.faint, fontSize: font.micro, marginTop: space.xs },
  destroy: { marginTop: space.l, paddingVertical: space.m, alignItems: 'center' },
  destroyText: { color: signal.error, fontSize: font.small, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: space.m, marginTop: space.l },
  cancel: {
    flex: 1,
    paddingVertical: space.l,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: surface.edge,
    alignItems: 'center',
  },
  cancelText: { color: text.muted, fontSize: font.body, fontWeight: '700' },
  save: {
    flex: 2,
    paddingVertical: space.l,
    borderRadius: radius.m,
    backgroundColor: text.primary,
    alignItems: 'center',
  },
  saveText: { color: surface.field, fontSize: font.body, fontWeight: '700' },
});
