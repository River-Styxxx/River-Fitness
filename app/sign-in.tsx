import React, { useState } from 'react';
import { TextInput, StyleSheet, View, Text } from 'react-native';
import { router } from 'expo-router';
import { Stack } from 'expo-router';
import { Screen, H1, Body, Button } from '../src/components/ui';
import { signIn } from '../src/data';
import { surface, text, space, font, radius, signal } from '../src/theme';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      await signIn(email.trim(), password);
      router.replace('/');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: 'River Fitness' }} />
      <View style={styles.wrap}>
        <H1>River Fitness</H1>
        <Body muted>Invite-only. Sign in with the account your coach set up.</Body>
        <TextInput
          style={styles.input}
          placeholder="email"
          placeholderTextColor={text.faint}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="password"
          placeholderTextColor={text.faint}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {err ? <Text style={styles.err}>{err}</Text> : null}
        <Button label={busy ? '…' : 'Sign in'} onPress={submit} disabled={busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: space.xl, gap: space.l, maxWidth: 420, width: '100%', alignSelf: 'center' },
  input: {
    backgroundColor: surface.field,
    color: text.primary,
    borderRadius: radius.m,
    padding: space.l,
    fontSize: font.body,
  },
  err: { color: signal.error, fontSize: font.small },
});
