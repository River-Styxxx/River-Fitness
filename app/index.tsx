import React from 'react';
import { Redirect } from 'expo-router';
import { useSession } from './_layout';

export default function Index() {
  const { role } = useSession();
  if (role === 'coach') return <Redirect href="/coach" />;
  if (role === 'client') return <Redirect href="/client" />;
  return <Redirect href="/sign-in" />;
}
