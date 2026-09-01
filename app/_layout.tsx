import React, { createContext, useContext, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../src/lib/supabase';
import { resolveRole, Role, Client } from '../src/data';
import { surface, text } from '../src/theme';
import { Loading } from '../src/components/ui';
import { watchForForcedUpdate } from '../src/lib/build';

type Session = { role: Role; client: Client | null; tenantId: string | null; userId: string | null; ready: boolean };

const SessionCtx = createContext<Session>({ role: 'none', client: null, tenantId: null, userId: null, ready: false });
export const useSession = () => useContext(SessionCtx);

export default function RootLayout() {
  const [state, setState] = useState<Session>({ role: 'none', client: null, tenantId: null, userId: null, ready: false });

  useEffect(() => {
    let mounted = true;
    async function refresh() {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id ?? null;
      const resolved = userId ? await resolveRole() : { role: 'none' as Role, client: null, tenantId: null };
      if (mounted) setState({ ...resolved, userId, ready: true });
    }
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh());
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // a build below the server's floor, or a newer bundle on the host, reloads
  // itself — quietly, and never while someone is mid-sentence in a sheet
  useEffect(() => watchForForcedUpdate(), []);

  if (!state.ready) return <Loading />;

  return (
    <SessionCtx.Provider value={state}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: surface.raised },
          headerTintColor: text.primary,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: surface.bg },
        }}
      >
        {/* the client group owns its own header (date + clock) — don't stack a second one on top */}
        <Stack.Screen name="client" options={{ headerShown: false }} />
        <Stack.Screen name="coach" options={{ headerShown: false }} />
      </Stack>
    </SessionCtx.Provider>
  );
}
