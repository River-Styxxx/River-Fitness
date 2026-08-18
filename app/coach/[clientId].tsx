import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, Stack } from 'expo-router';
import {
  getClient,
  getWeekSummaries,
  getDailySummaries,
  getTargets,
  Client,
  WeekSummary,
  DailySummary,
  NutritionTarget,
} from '../../src/data';
import { Screen, Card, H2, Body, Small, Row, StatTile, Loading } from '../../src/components/ui';
import { space, signal } from '../../src/theme';
import { Text } from 'react-native';

export default function ClientDetail() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [weeks, setWeeks] = useState<WeekSummary[] | null>(null);
  const [days, setDays] = useState<DailySummary[] | null>(null);
  const [targets, setTargets] = useState<NutritionTarget[] | null>(null);

  useEffect(() => {
    if (!clientId) return;
    getClient(clientId).then(setClient).catch(() => setClient(null));
    getWeekSummaries(clientId).then(setWeeks).catch(() => setWeeks([]));
    getDailySummaries(clientId, 14).then(setDays).catch(() => setDays([]));
    getTargets(clientId).then(setTargets).catch(() => setTargets([]));
  }, [clientId]);

  if (!client || weeks === null || days === null || targets === null) return <Loading />;

  const pFloor = targets.find((t) => t.protein_g != null)?.protein_g;

  return (
    <Screen>
      <Stack.Screen options={{ title: client.display_name }} />

      <H2 domain="nutrition">Last 14 days</H2>
      {days.map((d) => {
        const under = pFloor != null && Number(d.protein_g ?? 0) < Number(pFloor);
        return (
          <Card key={d.local_date} style={{ marginBottom: space.s, padding: space.m }}>
            <Row style={{ alignItems: 'center' }}>
              <Small>{d.local_date}</Small>
              <Body>{Math.round(Number(d.kcal ?? 0))} kcal</Body>
              <Body>{Math.round(Number(d.protein_g ?? 0))}g P</Body>
              <Small>{d.protein_g_per_100kcal ?? '—'} P/100</Small>
              {under ? <Text style={{ color: signal.attention }}>▲ under floor</Text> : null}
            </Row>
          </Card>
        );
      })}

      <H2 domain="coaching">Program weeks</H2>
      {weeks.map((w) => (
        <Card key={`${w.program_week}`}>
          <H2>Week {w.program_week}</H2>
          <Small>
            {w.week_start} → {w.week_end} · {w.days_logged} days
          </Small>
          <Row style={{ marginTop: space.m }}>
            <StatTile label="kcal/day" value={Math.round(Number(w.kcal_per_day ?? 0))} domain="nutrition" />
            <StatTile label="P/day" value={`${Math.round(Number(w.protein_g_per_day ?? 0))}g`} domain="nutrition" />
            <StatTile label="C/day" value={`${Math.round(Number(w.carbs_g_per_day ?? 0))}g`} />
            <StatTile label="F/day" value={`${Math.round(Number(w.fat_g_per_day ?? 0))}g`} />
            <StatTile label="P/100" value={w.protein_g_per_100kcal ?? '—'} domain="coaching" />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
