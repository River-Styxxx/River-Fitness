import React from 'react';
import { Tabs } from 'expo-router';
import { Text, useWindowDimensions } from 'react-native';
import { surface, text, domainColor, layout } from '../../src/theme';
import { HeaderDate, HeaderClock } from '../../src/components/DateClock';

import type { ColorValue } from 'react-native';

function Icon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;
}

export default function CoachTabs() {
  const { width } = useWindowDimensions();
  const sidebar = width > layout.compactUpTo;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: surface.raised },
        headerTintColor: text.primary,
        headerTitleAlign: 'left',
        headerTitle: () => <HeaderDate />,
        headerRight: () => <HeaderClock />,
        tabBarPosition: sidebar ? 'left' : 'top',
        tabBarVariant: sidebar ? 'material' : 'uikit',
        // coaching blue on the coach side, nutrition green on the client side
        tabBarActiveTintColor: domainColor.coaching,
        tabBarInactiveTintColor: text.muted,
        tabBarStyle: sidebar
          ? { backgroundColor: surface.raised, borderColor: surface.line }
          : { backgroundColor: surface.raised, borderBottomColor: surface.line },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Clients', tabBarIcon: ({ color }) => <Icon glyph="◈" color={color} /> }} />
      <Tabs.Screen name="me" options={{ title: 'My log', tabBarIcon: ({ color }) => <Icon glyph="◉" color={color} /> }} />
      {/* client detail is reached from the list, not the nav */}
      <Tabs.Screen name="[clientId]" options={{ href: null }} />
    </Tabs>
  );
}
