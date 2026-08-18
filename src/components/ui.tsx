import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle, ScrollView, ActivityIndicator } from 'react-native';
import { surface, text, space, font, radius, Domain, domainColor } from '../theme';

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  if (!scroll) return <View style={styles.screen}>{children}</View>;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: space.l, paddingBottom: space.xxl }}>
      {children}
    </ScrollView>
  );
}

export function Card({ children, domain, style }: { children: React.ReactNode; domain?: Domain; style?: ViewStyle }) {
  return (
    <View
      style={[
        styles.card,
        domain ? { borderLeftWidth: 3, borderLeftColor: domainColor[domain] } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}
export function H2({ children, domain }: { children: React.ReactNode; domain?: Domain }) {
  return <Text style={[styles.h2, domain ? { color: domainColor[domain] } : null]}>{children}</Text>;
}
export function Body({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <Text style={[styles.body, muted ? { color: text.muted } : null]}>{children}</Text>;
}
export function Small({ children }: { children: React.ReactNode }) {
  return <Text style={styles.small}>{children}</Text>;
}

export function StatTile({ label, value, unit, domain }: { label: string; value: string | number; unit?: string; domain?: Domain }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, domain ? { color: domainColor[domain] } : null]}>
        {value}
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', gap: space.m }, style]}>{children}</View>;
}

export function Button({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }, disabled && { opacity: 0.4 }]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function Loading() {
  return (
    <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator color={text.secondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.bg },
  card: {
    backgroundColor: surface.card,
    borderRadius: radius.m,
    padding: space.l,
    marginBottom: space.l,
  },
  h1: { color: text.primary, fontSize: font.heading, fontWeight: '700', marginBottom: space.l },
  h2: { color: text.primary, fontSize: font.title, fontWeight: '600', marginBottom: space.m },
  body: { color: text.secondary, fontSize: font.body, lineHeight: font.body * 1.45 },
  small: { color: text.muted, fontSize: font.small },
  stat: { flex: 1, backgroundColor: surface.card, borderRadius: radius.m, padding: space.l, alignItems: 'flex-start' },
  statValue: { color: text.primary, fontSize: font.heading, fontWeight: '700' },
  statUnit: { color: text.muted, fontSize: font.small, fontWeight: '400' },
  statLabel: { color: text.muted, fontSize: font.small, marginTop: space.xs },
  button: {
    backgroundColor: domainColor.coaching,
    borderRadius: radius.m,
    paddingVertical: space.l,
    paddingHorizontal: space.xl,
    alignItems: 'center',
  },
  buttonText: { color: surface.bg, fontSize: font.body, fontWeight: '700' },
});
