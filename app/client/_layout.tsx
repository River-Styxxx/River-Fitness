import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions } from 'react-native';
import { surface, text, domainColor, layout } from '../../src/theme';
import { HeaderDate, HeaderClock } from '../../src/components/DateClock';

import type { ColorValue } from 'react-native';

function Icon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;
}

export default function ClientTabs() {
  const { width } = useWindowDimensions();
  // phones keep the bottom bar; anything wider gets the nav as a left rail
  const sidebar = width > layout.compactUpTo;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: surface.raised },
        headerTintColor: text.primary,
        headerTitleAlign: 'left',
        headerTitle: () => <HeaderDate />,
        headerRight: () => <HeaderClock />,
        tabBarPosition: sidebar ? 'left' : 'bottom',
        tabBarVariant: sidebar ? 'material' : 'uikit',
        tabBarActiveTintColor: domainColor.nutrition,
        tabBarInactiveTintColor: text.muted,
        tabBarStyle: sidebar
          ? { backgroundColor: surface.raised, borderColor: surface.line }
          : {
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
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: ({ color }) => <Icon glyph="◉" color={color} /> }} />
      <Tabs.Screen name="week" options={{ title: 'Weeks', tabBarIcon: ({ color }) => <Icon glyph="✿" color={color} /> }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarIcon: ({ color }) => <Icon glyph="☰" color={color} /> }} />
    </Tabs>
  );
}
