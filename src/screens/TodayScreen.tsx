import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import {
  getDailySummaries,
  getEntriesForDate,
  getTargets,
  logMeal,
  uploadMealPhotos,
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
import {
  MealComposer,
  DraftItem,
  MealMacros,
  emptyItem,
  emptyMacros,
  toMealItems,
  toMealMacros,
} from '../components/MealComposer';

function todayLocal(tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
}

/**
 * The daily log. Rendered for a client viewing their own day, and for a coach
 * viewing their own — a coach is a client of their own practice.
 */
export function TodayScreen({ client, tenantId }: { client: Client | null; tenantId: string | null }) {
  const [entries, setEntries] = useState<FoodLogEntry[] | null>(null);
  const [today, setToday] = useState<DailySummary | null>(null);
  const [target, setTarget] = useState<NutritionTarget | null>(null);
  const [items, setItems] = useState<DraftItem[]>([emptyItem('i0')]);
  const [mealMacros, setMealMacros] = useState<MealMacros>(emptyMacros());
  const [shots, setShots] = useState<Partial<Record<Shot, PickedPhoto>>>({});
  const [totalWeight, setTotalWeight] = useState('');
  const [estimating, setEstimating] = useState(false);
  const [estimateNote, setEstimateNote] = useState<string | null>(null);
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

  const shotCount = Object.keys(shots).length;

  async function estimate() {
    setEstimateNote(null);
    setEstimating(true);
    try {
      const blobs = (Object.keys(shots) as Shot[]).map((kind) => ({ kind, blob: shots[kind]!.blob }));
      const out = await estimateFromPhotos(blobs, {
        clientId: client?.id ?? null,
        tenantId,
        totalWeightG: totalWeight.trim() ? Number(totalWeight) : null,
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

  async function add() {
    if (!client || !tenantId) return;
    setErr(null);
    try {
      const mealId = await logMeal({
        clientId: client.id,
        tenantId,
        items: toMealItems(items),
        mealMacros: toMealMacros(mealMacros),
      });

      // the meal is already committed; photos are a best-effort follow-up so a
      // bad connection costs a photo, not someone's dinner
      const photos = (Object.keys(shots) as Shot[]).map((kind) => ({
        kind,
        blob: shots[kind]!.blob,
      }));
      if (photos.length > 0) {
        const out = await uploadMealPhotos({ clientId: client.id, tenantId, mealId, photos });
        if (out.failed.length > 0) setErr(`Meal saved. Photo upload failed — ${out.failed[0]}`);
      }

      setItems([emptyItem(`i${Date.now()}`)]);
      setMealMacros(emptyMacros());
      setShots({});
      setTotalWeight('');
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
      <MacroMeter label="Calories" value={kcalNow} target={kcalTarget} unit="kcal" direction="ceiling" />
      <MacroMeter label="Protein" value={pNow} target={pTarget} unit="g" direction="floor" />
      <MacroMeter label="Carbs" value={cNow} target={cTarget} unit="g" direction="ceiling" />
      <MacroMeter label="Fat" value={fNow} target={fTarget} unit="g" direction="ceiling" />
      <Row style={{ marginTop: space.s }}>
        <StatTile label="P G/100kcal" value={today?.protein_g_per_100kcal ?? '—'} domain="coaching" />
      </Row>

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
        {shotCount > 0 ? (
          <Pressable
            onPress={estimate}
            disabled={estimating}
            style={({ pressed }) => [styles.estimate, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.estimateText}>
              {estimating ? 'Reading your photos…' : `Estimate from ${shotCount === 1 ? 'photo' : 'photos'}`}
            </Text>
          </Pressable>
        ) : null}
        {estimateNote ? <Text style={styles.estimateNote}>{estimateNote}</Text> : null}
        <MealComposer items={items} onItems={setItems} macros={mealMacros} onMacros={setMealMacros} />
        <Text style={styles.section}>Photos</Text>
        <PhotoShots shots={shots} onChange={setShots} weight={totalWeight} onWeight={setTotalWeight} />
        <View style={{ height: space.m }} />
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
  // a text input has an intrinsic content width on web; without minWidth: 0 a
  // flex row refuses to shrink it and the second field spills past the card
  inputInRow: { flex: 1, minWidth: 0 },
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
});
