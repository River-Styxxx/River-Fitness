import React from 'react';
import { useSession } from '../_layout';
import { TodayScreen } from '../../src/screens/TodayScreen';

export default function Today() {
  const { client, tenantId } = useSession();
  return <TodayScreen client={client} tenantId={tenantId} />;
}
