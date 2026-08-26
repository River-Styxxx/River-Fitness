import React from 'react';
import { useSession } from '../_layout';
import { TodayScreen } from '../../src/screens/TodayScreen';
import { Screen, H2, Body } from '../../src/components/ui';

/** The coach's own daily log — a coach is a client of their own practice. */
export default function CoachOwnLog() {
  const { client, tenantId } = useSession();
  if (!client) {
    return (
      <Screen>
        <H2 domain="coaching">No log yet</H2>
        <Body muted>
          Your own client record hasn&apos;t been created. Once it exists, your daily log lives here —
          same screen your clients use.
        </Body>
      </Screen>
    );
  }
  return <TodayScreen client={client} tenantId={tenantId} />;
}
