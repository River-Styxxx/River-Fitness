import React, { useEffect, useState } from 'react';
import { Text, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  getClient,
  getWeekSummaries,
  getDailySummaries,
  getTargets,
  getInstructions,
  Client,
  WeekSummary,
  DailySummary,
  NutritionTarget,
  StandingInstruction,
} from '../../src/data';
import { Screen, Card, H1, H2, Body, Small, Row, StatTile, Loading } from '../../src/components/ui';
import { space, signal, surface, text, font, radius, domainColor } from '../../src/theme';
import { TodayScreen } from '../../src/screens/TodayScreen';

/**
 * One client, as the coach sees them.
 *
 * The day view is literally the client's own screen with `readOnly` set — same
 * meters, same Day So Far block, same meals grouped the same way. Rendering the
 * same component is the point: a coach reviewing a day should be looking at
 * what the client is looking at, not at a second implementation that can drift
 * away from it. Only the place to log food is removed.
 *
 * The 14-day list doubles as the date picker for that view.
 */
export default function ClientDetail() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [weeks, setWeeks] = useState<WeekSummary[] | null>(null);
  const [days, setDays] = useState<DailySummary[] | null>(null);
  const [targets, setTargets] = useState<NutritionTarget[] | null>(null);
  const [instructions, setInstructions] = useState<StandingInstruction[] | null>(null);
  const [day, setDay] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    getClient(clientId).then(setClient).catch(() => setClient(null));
    getWeekSummaries(clientId).then(setWeeks).catch(() => setWeeks([]));
    getTargets(clientId).then(setTargets).catch(() => setTargets([]));
    getInstructions(clientId).then(setInstructions).catch(() => setInstructions([]));
    getDailySummaries(clientId, 14)
      .then((d) => {
        setDays(d);
        // open on the most recent day that actually has something in it
        setDay((prev) => prev ?? d[0]?.local_date ?? null);
      })
      .catch(() => setDays([]));
  }, [clientId]);

  if (!client || weeks === null || days === null || targets === null || instructions === null) {
    return <Loading />;
  }

  const pFloor = targets.find((t) => t.protein_g != null)?.protein_g;

  return (
    <Screen>
      <H1>{client.display_name}</H1>

      <H2 domain="nutrition">Their day</H2>
      {day ? (
        <>
          <Small>Showing {day} — tap any date below to change it.</Small>
          <TodayScreen client={client} tenantId={client.tenant_id} readOnly date={day} />
        </>
      ) : (
        <Body muted>Nothing logged yet.</Body>
      )}

      <H2 domain="nutrition">Last 14 days</H2>
      {days.map((d) => {
        const under = pFloor != null && Number(d.protein_g ?? 0) < Number(pFloor);
        const on = d.local_date === day;
        return (
          <Pressable
            key={d.local_date}
            onPress={() => setDay(d.local_date)}
            style={({ pressed }) => [styles.dayRow, on && styles.dayRowOn, pressed && { opacity: 0.85 }]}
          >
            <Row style={{ alignItems: 'center' }}>
              <Small>{d.local_date}</Small>
              <Body>{Math.round(Number(d.kcal ?? 0))} kcal</Body>
              <Body>{Math.round(Number(d.protein_g ?? 0))}g P</Body>
              <Small>{d.protein_g_per_100kcal ?? '—'} P/100</Small>
              {under ? <Text style={{ color: signal.attention }}>▲ under floor</Text> : null}
            </Row>
          </Pressable>
        );
      })}

      <H2 domain="coaching">Their instructions</H2>
      {instructions.length === 0 ? (
        <Body muted>None set.</Body>
      ) : (
        instructions.map((i) => (
          <Card key={i.id} domain="coaching" style={{ marginBottom: space.s }}>
            {i.title ? <H2 domain="coaching">{i.title}</H2> : null}
            <Body>{i.body}</Body>
          </Card>
        ))
      )}

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

const styles = StyleSheet.create({
  dayRow: {
    backgroundColor: surface.card,
    borderRadius: radius.s,
    padding: space.m,
    marginBottom: space.s,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  dayRowOn: { borderLeftColor: domainColor.nutrition },
});
