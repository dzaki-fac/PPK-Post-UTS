import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface MetricItem {
  label: string;
  value: string | number;
  description?: string;
  tint?: 'default' | 'green' | 'amber' | 'blue' | 'indigo' | 'teal';
}

const TINT_STYLE: Record<NonNullable<MetricItem['tint']>, { bg: string; border: string; value: string }> = {
  default: { bg: '#FFFFFF', border: '#E2E8F0', value: '#0F172A' },
  green: { bg: '#F0FDF4', border: '#BBF7D0', value: '#15803D' },
  amber: { bg: '#FFFBEB', border: '#FDE68A', value: '#B45309' },
  blue: { bg: '#EFF6FF', border: '#BFDBFE', value: '#1D4ED8' },
  indigo: { bg: '#EEF2FF', border: '#C7D2FE', value: '#4F46E5' },
  teal: { bg: '#F0FDFA', border: '#99F6E4', value: '#0D9488' },
};

export function MetricsGrid({ items }: { items: MetricItem[] }) {
  return (
    <View style={styles.grid}>
      {items.map((item) => {
        const tint = TINT_STYLE[item.tint ?? 'default'];
        return (
          <View key={item.label} style={[styles.card, { backgroundColor: tint.bg, borderColor: tint.border }]}>
            <Text style={[styles.value, { color: tint.value }]}>{item.value}</Text>
            <Text style={styles.label}>{item.label}</Text>
            {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    flex: 1,
    minWidth: 140,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    elevation: 1,
  },
  value: { fontSize: 24, fontWeight: '900' },
  label: { fontSize: 12, fontWeight: '700', color: '#334155', marginTop: 2 },
  description: { fontSize: 11, color: '#64748B', marginTop: 2 },
});
