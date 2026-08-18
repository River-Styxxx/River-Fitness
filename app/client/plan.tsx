import React, { useEffect, useState } from 'react';
import { useSession } from '../_layout';
import { getTargets, getInstructions, getPublishedReports, NutritionTarget, StandingInstruction, ClientReport, signOut } from '../../src/data';
import { Screen, Card, H2, Body, Small, Row, StatTile, Button, Loading } from '../../src/components/ui';
import { space } from '../../src/theme';
import { router } from 'expo-router';

export default function Plan() {
  const { client } = useSession();
  const [targets, setTargets] = useState<NutritionTarget[] | null>(null);
  const [instructions, setInstructions] = useState<StandingInstruction[] | null>(null);
  const [reports, setReports] = useState<ClientReport[] | null>(null);

  useEffect(() => {
    if (!client) return;
    getTargets(client.id).then(setTargets).catch(() => setTargets([]));
    getInstructions(client.id).then(setInstructions).catch(() => setInstructions([]));
    getPublishedReports(client.id).then(setReports).catch(() => setReports([]));
  }, [client]);

  if (!client || targets === null || instructions === null || reports === null) return <Loading />;

  return (
    <Screen>
      <H2 domain="nutrition">Targets</H2>
      {targets.map((t) => (
        <Card key={t.id} domain="nutrition">
          <Small>
            {t.day_type} · from {t.effective_date}
          </Small>
          <Row style={{ marginTop: space.m }}>
            <StatTile label="kcal" value={t.kcal != null ? Math.round(Number(t.kcal)) : '—'} domain="nutrition" />
            <StatTile label="protein g" value={t.protein_g != null ? Math.round(Number(t.protein_g)) : '—'} domain="nutrition" />
            <StatTile label="carbs g" value={t.carbs_g != null ? Math.round(Number(t.carbs_g)) : '—'} />
            <StatTile label="fat g" value={t.fat_g != null ? Math.round(Number(t.fat_g)) : '—'} />
          </Row>
        </Card>
      ))}

      <H2 domain="coaching">Standing instructions</H2>
      {instructions.length === 0 ? <Body muted>None yet.</Body> : null}
      {instructions.map((si) => (
        <Card key={si.id} domain="coaching">
          {si.title ? <H2 domain="coaching">{si.title}</H2> : null}
          <Body>{si.body}</Body>
        </Card>
      ))}

      <H2 domain="coaching">Reviews</H2>
      {reports.length === 0 ? <Body muted>Your coach hasn’t published a review yet.</Body> : null}
      {reports.map((r) => (
        <Card key={r.id} domain="coaching">
          <Body>{r.title}</Body>
          <Small>
            {r.period_start} → {r.period_end}
          </Small>
        </Card>
      ))}

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
