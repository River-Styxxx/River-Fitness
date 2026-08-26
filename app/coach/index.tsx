import React, { useEffect, useState } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { listClients, getLatestDailyAcrossClients, Client, DailySummary, signOut } from '../../src/data';
import { Screen, H1, Body, Small, Loading, Button } from '../../src/components/ui';
import { surface, text, space, font, radius, signal, domainColor } from '../../src/theme';

function daysAgo(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

export default function CoachHome() {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [latest, setLatest] = useState<Map<string, DailySummary> | null>(null);

  useEffect(() => {
    listClients().then(setClients).catch(() => setClients([]));
    getLatestDailyAcrossClients()
      .then((rows) => {
        const m = new Map<string, DailySummary>();
        for (const r of rows) {
          if (r.client_id && !m.has(r.client_id)) m.set(r.client_id, r); // rows come newest-first
        }
        setLatest(m);
      })
      .catch(() => setLatest(new Map()));
  }, []);

  if (clients === null || latest === null) return <Loading />;

  return (
    <Screen>
      <H1>Clients</H1>
      {clients.map((c) => {
        const last = latest.get(c.id);
        const gap = daysAgo(last?.local_date ?? null);
        const stale = gap !== null && gap >= 2;
        return (
          <Pressable key={c.id} onPress={() => router.push(`/coach/${c.id}`)} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Body>{c.display_name}</Body>
              <Small>
                {last?.local_date
                  ? `last log ${last.local_date} · ${Math.round(Number(last.kcal ?? 0))} kcal · ${Math.round(Number(last.protein_g ?? 0))}g P`
                  : 'no logs yet'}
              </Small>
            </View>
            {stale || !last ? (
              <View style={styles.flag}>
                <Text style={styles.flagText}>{!last ? 'no data' : `${gap}d silent`}</Text>
              </View>
            ) : (
              <Text style={{ color: domainColor.nutrition, fontSize: font.small }}>●</Text>
            )}
          </Pressable>
        );
      })}
      <Button
        label="Sign out"
        onPress={async () => {
          await signOut();
          router.replace('/sign-in');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: surface.card,
    borderRadius: radius.m,
    padding: space.l,
    marginBottom: space.m,
    gap: space.m,
  },
  flag: {
    backgroundColor: signal.attention,
    borderRadius: radius.pill,
    paddingHorizontal: space.m,
    paddingVertical: space.xs,
  },
  flagText: { color: surface.bg, fontSize: font.micro, fontWeight: '700' },
});
