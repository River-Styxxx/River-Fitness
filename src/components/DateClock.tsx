import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { text, font } from '../theme';

/** "August 19, 2026" — written out, client's own locale-independent US long form. */
export function HeaderDate() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // re-check every 30s so the date flips at midnight without a reload
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return (
    <Text style={styles.date}>
      {now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
    </Text>
  );
}

/** Live wall clock, ticks every second. */
export function HeaderClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <Text style={styles.clock}>
      {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
    </Text>
  );
}

const styles = StyleSheet.create({
  date: { color: text.primary, fontSize: font.body, fontWeight: '700' },
  clock: { color: text.primary, fontSize: font.body, fontWeight: '700', fontVariant: ['tabular-nums'], marginRight: 13 },
});
