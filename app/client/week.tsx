import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSession } from '../_layout';
import { getWeekSummaries, getDailySummaries, WeekSummary, DailySummary } from '../../src/data';
import { Screen, Card, H2, Body, Small, Row, StatTile, Loading } from '../../src/components/ui';
import { Phyllotaxis } from '../../src/components/Phyllotaxis';
import { space } from '../../src/theme';

export default function Weeks() {
  const { client } = useSession();
  const [weeks, setWeeks] = useState<WeekSummary[] | null>(null);
  const [days, setDays] = useState<DailySummary[] | null>(null);

  const load = useCallback(async () => {
    if (!client) return;
    await Promise.all([
      getWeekSummaries(client.id).then(setWeeks).catch(() => setWeeks([])),
      getDailySummaries(client.id, 120).then(setDays).catch(() => setDays([])),
    ]);
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!client || weeks === null || days === null) return <Loading />;

  // Build the seed head: every date from start_date to today, logged = has a summary row
  const seeds: { logged: boolean }[] = [];
  if (client.start_date) {
    const have = new Set(days.map((d) => d.local_date));
    const start = new Date(client.start_date + 'T00:00:00');
    const now = new Date();
    for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
      seeds.push({ logged: have.has(d.toISOString().slice(0, 10)) });
    }
  }

  return (
    <Screen onRefresh={load}>
      <Card domain="nutrition">
        <H2 domain="nutrition">Your log, growing</H2>
        <Phyllotaxis days={seeds} />
        <Small>
          Every logged day is a seed at the golden angle. {seeds.filter((s) => s.logged).length} days logged of{' '}
          {seeds.length}.
        </Small>
      </Card>

      {weeks.map((w) => (
        <Card key={`${w.program_week}`}>
          <H2>Week {w.program_week}</H2>
          <Small>
            {w.week_start} → {w.week_end} · {w.days_logged} days logged
          </Small>
          <Row style={{ marginTop: space.m }}>
            <StatTile label="kcal/day" value={Math.round(Number(w.kcal_per_day ?? 0))} domain="nutrition" />
            <StatTile label="protein/day" value={`${Math.round(Number(w.protein_g_per_day ?? 0))}g`} domain="nutrition" />
            <StatTile label="P g/100kcal" value={w.protein_g_per_100kcal ?? '—'} domain="coaching" />
          </Row>
          <Row style={{ marginTop: space.m }}>
            <StatTile label="carbs/day" value={`${Math.round(Number(w.carbs_g_per_day ?? 0))}g`} />
            <StatTile label="fat/day" value={`${Math.round(Number(w.fat_g_per_day ?? 0))}g`} />
          </Row>
        </Card>
      ))}
      {weeks.length === 0 ? <Body muted>No weeks yet — log your first meal.</Body> : null}
    </Screen>
  );
}
