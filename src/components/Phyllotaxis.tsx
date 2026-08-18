import React from 'react';
import { View } from 'react-native';
import { GOLDEN_ANGLE, domainColor, surface, signal } from '../theme';

/**
 * The signature streak visual: each logged day is a seed placed at the golden
 * angle (137.5°), r = c·sqrt(n) — a genuine phyllotaxis (sunflower) packing.
 * Perfect days render brighter; missed days leave gaps in the head.
 */
export function Phyllotaxis({
  days,
  size = 220,
}: {
  /** ordered oldest→newest; each day: logged (seed present) and perfect (bright) */
  days: { logged: boolean; perfect?: boolean }[];
  size?: number;
}) {
  const c = size / (2.3 * Math.sqrt(Math.max(days.length, 12)));
  const center = size / 2;
  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      {days.map((d, n) => {
        if (!d.logged) return null;
        const theta = (n * GOLDEN_ANGLE * Math.PI) / 180;
        const r = c * Math.sqrt(n + 1);
        const x = center + r * Math.cos(theta);
        const y = center + r * Math.sin(theta);
        const dot = d.perfect ? 7 : 5;
        return (
          <View
            key={n}
            style={{
              position: 'absolute',
              left: x - dot / 2,
              top: y - dot / 2,
              width: dot,
              height: dot,
              borderRadius: dot,
              backgroundColor: d.perfect ? signal.success : domainColor.nutrition,
              opacity: d.perfect ? 1 : 0.75,
            }}
          />
        );
      })}
      <View
        style={{
          position: 'absolute',
          left: center - 2,
          top: center - 2,
          width: 4,
          height: 4,
          borderRadius: 4,
          backgroundColor: surface.line,
        }}
      />
    </View>
  );
}
