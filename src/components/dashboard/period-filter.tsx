import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DashboardPeriod } from '@/types/sprint4-p2';

export interface PeriodFilterProps {
  period: DashboardPeriod;
  periodLabel: string;
  onPeriodChange: (period: DashboardPeriod) => void;
  onShift: (delta: number) => void;
}

const OPTIONS: { key: DashboardPeriod; label: string }[] = [
  { key: 'hari', label: 'Hari' },
  { key: 'minggu', label: 'Minggu' },
  { key: 'bulan', label: 'Bulan' },
];

export function PeriodFilter({ period, periodLabel, onPeriodChange, onShift }: PeriodFilterProps) {
  return (
    <View style={styles.container}>
      <View style={styles.segment}>
        {OPTIONS.map((option) => {
          const active = option.key === period;
          return (
            <Pressable
              key={option.key}
              onPress={() => onPeriodChange(option.key)}
              style={({ pressed }) => [
                styles.segmentButton,
                active && styles.segmentButtonActive,
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.navigator}>
        <Pressable
          onPress={() => onShift(-1)}
          style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
          accessibilityLabel="Periode sebelumnya">
          <Text style={styles.navText}>←</Text>
        </Pressable>
        <Text style={styles.periodLabel}>{periodLabel}</Text>
        <Pressable
          onPress={() => onShift(1)}
          style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
          accessibilityLabel="Periode berikutnya">
          <Text style={styles.navText}>→</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentButton: { flex: 1, minHeight: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  segmentButtonActive: { backgroundColor: '#4F46E5' },
  segmentText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  segmentTextActive: { color: '#FFFFFF' },
  navigator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: { fontSize: 17, fontWeight: '800', color: '#4F46E5' },
  periodLabel: { fontSize: 12, fontWeight: '700', color: '#334155', flex: 1, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
