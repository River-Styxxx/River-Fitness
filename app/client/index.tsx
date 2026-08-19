import React, { useCallback, useEffect, useState } from 'react';
import { View, TextInput, StyleSheet, Text } from 'react-native';
import { useSession } from '../_layout';
import {
  getDailySummaries,
  getEntriesForDate,
  getTargets,
  addFoodLogEntry,
  DailySummary,
  FoodLogEntry,
  NutritionTarget,
} from '../../src/data';
import { Screen, Card, H2, Body, Small, StatTile, MacroMeter, Row, Button, Loading } from '../../src/components/ui';
import { surface, text, space, font, radius, signal, domainColor } from '../../src/theme';

function todayLocal(tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
}

export default function Today() {
  const { client, tenantId } = useSession();
  const [entries, setEntries] = useState<FoodLogEntry[] | null>(null);
  const [today, setToday] = useState<DailySummary | null>(null);
  const [target, setTarget] = useState<NutritionTarget | null>(null);
  const [desc, setDesc] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const date = client ? todayLocal(client.timezone) : '';

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

  async function add() {
    if (!client || !tenantId || !desc.trim()) return;
    try {
      await addFoodLogEntry({
        clientId: client.id,
        tenantId,
        description: desc.trim(),
        kcal: kcal ? Number(kcal) : undefined,
        protein_g: protein ? Number(protein) : undefined,
      });
      setDesc('');
      setKcal('');
      setProtein('');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'failed');
    }
  }

  const kcalNow = Number(today?.kcal ?? 0);
  const pNow = Number(today?.protein_g ?? 0);
  const cNow = Number(today?.carbs_g ?? 0);
  const fNow = Number(today?.fat_g ?? 0);
  const kcalTarget = target?.kcal ? Number(target.kcal) : null;
  const pTarget = target?.protein_g ? Number(target.protein_g) : null;
  const cTarget = target?.carbs_g ? Number(target.carbs_g) : null;
  const fTarget = target?.fat_g ? Number(target.fat_g) : null;

  return (
    <Screen>
      <MacroMeter label="calories" value={kcalNow} target={kcalTarget} unit="kcal" direction="ceiling" />
      <MacroMeter label="protein" value={pNow} target={pTarget} unit="g" direction="floor" />
      <MacroMeter label="carbs" value={cNow} target={cTarget} unit="g" direction="ceiling" />
      <MacroMeter label="fat" value={fNow} target={fTarget} unit="g" direction="ceiling" />
      <Row style={{ marginTop: space.s }}>
        <StatTile label="P g/100kcal" value={today?.protein_g_per_100kcal ?? '—'} domain="coaching" />
      </Row>

      <Card style={{ marginTop: space.l }} domain="nutrition">
        <H2>Log food</H2>
        <TextInput
          style={styles.input}
          placeholder="what did you eat?"
          placeholderTextColor={text.faint}
          value={desc}
          onChangeText={setDesc}
        />
        <Row>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="kcal"
            placeholderTextColor={text.faint}
            keyboardType="numeric"
            value={kcal}
            onChangeText={setKcal}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="protein g"
            placeholderTextColor={text.faint}
            keyboardType="numeric"
            value={protein}
            onChangeText={setProtein}
          />
        </Row>
        <Button label="Add" onPress={add} />
        {err ? <Text style={{ color: signal.error, marginTop: space.m, fontSize: font.small }}>{err}</Text> : null}
        <Small>No numbers? Log it anyway — it lands as pending and gets estimated.</Small>
      </Card>

      <H2 domain="nutrition">Today · {date}</H2>
      {entries === null ? (
        <Body muted>loading…</Body>
      ) : entries.length === 0 ? (
        <Body muted>Nothing logged yet.</Body>
      ) : (
        entries.map((e) => (
          <View key={e.id} style={styles.entry}>
            <View style={{ flex: 1 }}>
              <Body>{e.description}</Body>
              {e.qty ? <Small>{e.qty}</Small> : null}
            </View>
            <Text style={styles.entryKcal}>
              {e.kcal != null ? `${Math.round(Number(e.kcal))} kcal` : e.status === 'pending' ? 'pending' : '—'}
            </Text>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: surface.raised,
    color: text.primary,
    borderRadius: radius.s,
    padding: space.m,
    fontSize: font.body,
    marginBottom: space.m,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: surface.card,
    borderRadius: radius.s,
    padding: space.l,
    marginBottom: space.s,
    gap: space.m,
  },
  entryKcal: { color: domainColor.nutrition, fontSize: font.small, fontWeight: '600' },
});
