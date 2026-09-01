import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { surface, text, space, font, radius, layout, signal, Domain, domainColor } from '../theme';

/**
 * Every route renders through Screen. The app is phone-shaped at any viewport:
 * content is capped at `layout.content` and centred. Wide viewports get side
 * rails (left = menu, right = notes/tips) rather than a stretched column —
 * pass `left` / `right` to fill them; they render nothing until then.
 */
export function Screen({
  children,
  scroll = true,
  left,
  right,
  onRefresh,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  left?: React.ReactNode;
  right?: React.ReactNode;
  /** pull down from the top to run this — usually the screen's own load() */
  onRefresh?: () => void | Promise<void>;
}) {
  const { width } = useWindowDimensions();
  // phones and small tablets: full bleed. anything wider: the phone-width column.
  const compact = width <= layout.compactUpTo;
  const rails = width >= layout.railsFrom;
  const shellMax = compact
    ? undefined
    : rails
      ? layout.content + 2 * (layout.rail + layout.gutter)
      : layout.content;

  const body = (
    <View style={[styles.shell, shellMax ? { maxWidth: shellMax } : null]}>
      {rails ? <View style={styles.rail}>{left}</View> : null}
      <View style={[styles.column, compact ? styles.columnFull : styles.columnFramed]}>{children}</View>
      {rails ? <View style={styles.rail}>{right}</View> : null}
    </View>
  );

  if (!scroll) return <View style={[styles.screen, styles.centred]}>{body}</View>;

  if (!onRefresh) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
        {body}
      </ScrollView>
    );
  }

  return <RefreshableScreen onRefresh={onRefresh}>{body}</RefreshableScreen>;
}

const PULL_TRIGGER = 64; // px of pull before it counts as "refresh"
const PULL_MAX = 96;
const PULL_RESIST = 0.5; // drag feels weighted rather than 1:1

/**
 * Pull-to-refresh.
 *
 * Native gets RefreshControl. The web build cannot: react-native-web ships
 * RefreshControl as an inert component, and a browser's own pull-to-refresh is
 * unavailable inside an installed PWA and reloads the whole page in a tab —
 * throwing away the session rather than re-reading the data. So on web the
 * gesture is tracked directly: only once the list is already at the top, with
 * resistance applied so a scroll that happens to start at zero does not trip it.
 */
function RefreshableScreen({
  children,
  onRefresh,
}: {
  children: React.ReactNode;
  onRefresh: () => void | Promise<void>;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [pull, setPull] = useState(0);
  const atTop = useRef(true);
  const startY = useRef<number | null>(null);

  const run = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      setPull(0);
    }
  }, [onRefresh, refreshing]);

  if (Platform.OS !== 'web') {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={run}
            tintColor={text.primary}
            colors={[text.primary]}
            progressBackgroundColor={surface.card}
          />
        }
      >
        {children}
      </ScrollView>
    );
  }

  const armed = pull >= PULL_TRIGGER;

  return (
    <View style={styles.screen}>
      {pull > 0 || refreshing ? (
        <View style={[styles.pullBar, { height: refreshing ? 34 : pull }]}>
          {refreshing ? (
            <ActivityIndicator color={text.primary} />
          ) : (
            <Text style={[styles.pullText, armed && { color: text.primary }]}>
              {armed ? 'Release to refresh' : 'Pull to refresh'}
            </Text>
          )}
        </View>
      ) : null}

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        onScroll={(e) => {
          atTop.current = e.nativeEvent.contentOffset.y <= 0;
        }}
        onTouchStart={(e) => {
          startY.current = atTop.current ? e.nativeEvent.pageY : null;
        }}
        onTouchMove={(e) => {
          if (startY.current == null || refreshing) return;
          const d = (e.nativeEvent.pageY - startY.current) * PULL_RESIST;
          setPull(d > 0 ? Math.min(d, PULL_MAX) : 0);
        }}
        onTouchEnd={() => {
          startY.current = null;
          if (pull >= PULL_TRIGGER) void run();
          else setPull(0);
        }}
        onTouchCancel={() => {
          startY.current = null;
          setPull(0);
        }}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function Card({ children, domain, style }: { children: React.ReactNode; domain?: Domain; style?: ViewStyle }) {
  return (
    <View
      style={[
        styles.card,
        // accent stripe follows the text colour, not the domain hue
        domain ? { borderLeftWidth: 3, borderLeftColor: text.primary } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}
export function H2({ children, domain }: { children: React.ReactNode; domain?: Domain }) {
  return <Text style={[styles.h2, domain ? { color: domainColor[domain] } : null]}>{children}</Text>;
}
export function Body({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <Text style={[styles.body, muted ? { color: text.muted } : null]}>{children}</Text>;
}
export function Small({ children }: { children: React.ReactNode }) {
  return <Text style={styles.small}>{children}</Text>;
}

export function StatTile({ label, value, unit, domain }: { label: string; value: string | number; unit?: string; domain?: Domain }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, domain ? { color: domainColor[domain] } : null]}>
        {value}
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}


// ---------- macro meters ----------
/**
 * Two kinds of target, two colour rules. Signal colours only — never domain
 * accents, which stay reserved for identity (spec: domain colour never state).
 *
 * floor   (protein): under target is the miss. red -> yellow at 90% -> green at goal.
 * ceiling (carbs, fat): over target is the miss. green -> yellow at 90% -> red past goal.
 */
export type MeterDirection = 'floor' | 'ceiling';

export function meterColor(value: number, target: number, direction: MeterDirection): string {
  if (!target) return text.muted;
  const pct = value / target;
  if (direction === 'floor') {
    if (pct >= 1) return signal.success;
    if (pct >= 0.9) return signal.attention;
    return signal.error;
  }
  if (pct > 1) return signal.error;
  if (pct >= 0.9) return signal.attention;
  return signal.success;
}

export function MacroMeter({
  label,
  value,
  target,
  unit,
  direction,
}: {
  label: string;
  value: number;
  target: number | null;
  unit?: string;
  direction?: MeterDirection;
}) {
  const v = Math.round(value);
  const t = target != null ? Math.round(target) : null;
  const colored = t != null && direction != null;
  const color = colored ? meterColor(v, t, direction) : text.muted;
  const fill = t ? Math.min(v / t, 1) : 0;

  return (
    <View style={styles.meter}>
      <View style={styles.meterHead}>
        <Text style={styles.meterLabel}>{label}</Text>
        <Text style={styles.meterValue}>
          <Text style={{ color }}>{v}</Text>
          <Text style={styles.meterTarget}>{t != null ? `/${t}` : ''}{unit ? ` ${unit}` : ''}</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${fill * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', gap: space.m }, style]}>{children}</View>;
}

export function Button({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }, disabled && { opacity: 0.4 }]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function Loading() {
  return (
    <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator color={text.secondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.bg },
  centred: { alignItems: 'center' },
  scrollContent: { alignItems: 'center', minHeight: '100%' },
  pullBar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: surface.bg,
  },
  pullText: { color: text.faint, fontSize: font.micro, fontWeight: '700' },
  shell: { width: '100%', flexDirection: 'row', gap: layout.gutter, alignSelf: 'center', flexGrow: 1 },
  rail: { width: layout.rail },
  // the reading column itself is near-black; pale blue is only the margins
  column: {
    flex: 1,
    maxWidth: layout.content,
    padding: space.l,
    paddingBottom: space.xxl,
    backgroundColor: surface.edge,
  },
  columnFull: { maxWidth: undefined, width: '100%' },
  columnFramed: {
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: surface.edge,
  },
  card: {
    backgroundColor: surface.card,
    borderRadius: radius.m,
    padding: space.l,
    marginBottom: space.l,
    borderWidth: 2,
    borderColor: surface.edge,
  },
  h1: { color: text.primary, fontSize: font.heading, fontWeight: '700', marginBottom: space.l },
  h2: { color: text.primary, fontSize: font.title, fontWeight: '600', marginBottom: space.m },
  body: { color: text.secondary, fontSize: font.body, lineHeight: font.body * 1.45 },
  small: { color: text.muted, fontSize: font.small },
  stat: {
    flex: 1,
    backgroundColor: surface.card,
    borderRadius: radius.m,
    padding: space.l,
    alignItems: 'flex-start',
    borderWidth: 2,
    borderColor: surface.edge,
  },
  statValue: { color: text.primary, fontSize: font.heading, fontWeight: '700' },
  statUnit: { color: text.muted, fontSize: font.small, fontWeight: '400' },
  statLabel: { color: text.primary, fontSize: font.body, fontWeight: '700', marginTop: space.xs },
  meter: {
    backgroundColor: surface.card,
    borderRadius: radius.m,
    padding: space.l,
    marginBottom: space.m,
    borderWidth: 2,
    borderColor: surface.edge,
  },
  meterHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: space.m },
  meterLabel: { color: text.primary, fontSize: font.body, fontWeight: '700' },
  meterValue: { fontSize: font.title, fontWeight: '700', fontVariant: ['tabular-nums'] },
  meterTarget: { color: text.muted, fontSize: font.small, fontWeight: '400' },
  track: { height: space.s, borderRadius: radius.pill, backgroundColor: surface.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  button: {
    backgroundColor: domainColor.coaching,
    borderRadius: radius.m,
    paddingVertical: space.l,
    paddingHorizontal: space.xl,
    alignItems: 'center',
  },
  buttonText: { color: surface.bg, fontSize: font.body, fontWeight: '700' },
});
