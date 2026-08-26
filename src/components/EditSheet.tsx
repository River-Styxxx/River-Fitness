import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { surface, text, space, font, radius, layout } from '../theme';

export type SheetField = {
  key: string;
  label: string;
  value: string;
  numeric?: boolean;
  placeholder?: string;
  /** render two per row instead of one full-width */
  half?: boolean;
};

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
  onCancel,
  onSave,
}: {
  visible: boolean;
  title: string;
  hint?: string;
  fields: SheetField[];
  onCancel: () => void;
  onSave: (values: Record<string, string>) => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});

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
              {fields.map((f) => (
                <View key={f.key} style={[styles.fieldWrap, f.half && styles.fieldHalf]}>
                  <Text style={styles.label}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={draft[f.key] ?? ''}
                    onChangeText={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
                    placeholder={f.placeholder}
                    placeholderTextColor={text.faint}
                    keyboardType={f.numeric ? 'numeric' : 'default'}
                    autoFocus={f === fields[0]}
                  />
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.7 }]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onSave(draft)}
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
  label: { color: text.primary, fontSize: font.small, fontWeight: '700', marginBottom: space.s },
  input: {
    backgroundColor: surface.field,
    color: text.primary,
    borderRadius: radius.s,
    padding: space.l,
    fontSize: font.title,
  },
  actions: { flexDirection: 'row', gap: space.m, marginTop: space.xl },
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
