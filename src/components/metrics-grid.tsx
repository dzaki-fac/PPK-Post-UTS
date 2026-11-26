import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

export interface MetricGridItem {
  key: string;
  label: string;
  value: string | number;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  hint?: string;
}

interface MetricsGridProps {
  items: MetricGridItem[];
  accentColor?: string;
}

const TONE_COLOR: Record<NonNullable<MetricGridItem['tone']>, string> = {
  default: '#0F172A',
  primary: '#4F46E5',
  success: '#16A34A',
  warning: '#B45309',
  danger: '#DC2626',
  info: '#0D9488',
};

/**
 * Strip metrik 4-kolom (1 baris pada layar lebar, 2x2 pada layar sempit) sesuai DESIGN.md.
 */
export function MetricsGrid({ items, accentColor = '#4F46E5' }: MetricsGridProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 680;

  return (
    <View style={[styles.container, isWide && styles.containerWide]}>
      {items.map((item, idx) => {
        const valueColor =
          item.tone === 'primary'
            ? accentColor
            : TONE_COLOR[item.tone ?? 'default'];

        return (
          <View
            key={item.key}
            style={[
              styles.card,
              isWide ? styles.cardWide : styles.cardCompact,
              isWide && idx < items.length - 1 && styles.cardDividerRight,
            ]}>
            <Text style={[styles.value, { color: valueColor }]} numberOfLines={1}>
              {item.value}
            </Text>
            <Text style={styles.label} numberOfLines={1}>
              {item.label}
            </Text>
            {item.hint ? (
              <Text style={styles.hint} numberOfLines={1}>
                {item.hint}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  containerWide: {
    flexWrap: 'nowrap',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 6,
    gap: 0,
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCompact: {
    width: '48.4%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  cardWide: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cardDividerRight: {
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  label: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  hint: {
    marginTop: 2,
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
