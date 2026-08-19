import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { surface, text, domainColor, layout } from '../../src/theme';

import type { ColorValue } from 'react-native';

function Icon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;
}

export default function ClientTabs() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: surface.raised },
        headerTintColor: text.primary,
        // keep the tab bar on the phone-width column instead of spanning the viewport
        tabBarStyle: {
          backgroundColor: surface.raised,
          borderTopColor: surface.line,
          width: '100%',
          maxWidth: layout.content,
          alignSelf: 'center',
          borderLeftWidth: StyleSheet.hairlineWidth,
          borderRightWidth: StyleSheet.hairlineWidth,
          borderLeftColor: surface.line,
          borderRightColor: surface.line,
        },
        tabBarActiveTintColor: domainColor.nutrition,
        tabBarInactiveTintColor: text.muted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: ({ color }) => <Icon glyph="◉" color={color} /> }} />
      <Tabs.Screen name="week" options={{ title: 'Weeks', tabBarIcon: ({ color }) => <Icon glyph="✿" color={color} /> }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarIcon: ({ color }) => <Icon glyph="☰" color={color} /> }} />
    </Tabs>
  );
}
