import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { DashboardPeriodType } from '@/utils/wib';

interface PeriodFilterBarProps {
  period: DashboardPeriodType;
  periodLabel: string;
  onSelectPeriod: (period: DashboardPeriodType) => void;
  onShiftPeriod: (delta: -1 | 1) => void;
  onResetToday: () => void;
}

const PERIOD_OPTIONS: { key: DashboardPeriodType; label: string }[] = [
  { key: 'hari', label: 'Hari' },
  { key: 'minggu', label: 'Minggu' },
  { key: 'bulan', label: 'Bulan' },
];

export function PeriodFilterBar({
  period,
  periodLabel,
  onSelectPeriod,
  onShiftPeriod,
  onResetToday,
}: PeriodFilterBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.segmentedRow}>
        {PERIOD_OPTIONS.map((opt) => {
          const active = period === opt.key;
          return (
            <Pressable
              key={opt.key}
              accessibilityRole="button"
              accessibilityLabel={`Filter periode ${opt.label}`}
              onPress={() => onSelectPeriod(opt.key)}
              style={({ pressed }) => [
                styles.segmentBtn,
                active && styles.segmentBtnActive,
                pressed && styles.pressed,
              ]}>
              <Text
                style={[
                  styles.segmentText,
                  active && styles.segmentTextActive,
                ]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.navRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Periode sebelumnya"
          onPress={() => onShiftPeriod(-1)}
          style={({ pressed }) => [styles.arrowBtn, pressed && styles.pressed]}>
          <Text style={styles.arrowText}>←</Text>
        </Pressable>

        <View style={styles.labelWrap}>
          <Text style={styles.periodLabel} numberOfLines={1}>
            {periodLabel}
          </Text>
          <Text style={styles.tzHint}>Zona Waktu WIB (UTC+7)</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Periode berikutnya"
          onPress={() => onShiftPeriod(1)}
          style={({ pressed }) => [styles.arrowBtn, pressed && styles.pressed]}>
          <Text style={styles.arrowText}>→</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali ke hari ini"
          onPress={onResetToday}
          style={({ pressed }) => [styles.todayBtn, pressed && styles.pressed]}>
          <Text style={styles.todayText}>Hari Ini</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 12,
  },
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: Colors.aslabPrimary,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arrowBtn: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  labelWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  periodLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  tzHint: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  todayBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.aslabTint,
    borderWidth: 1,
    borderColor: Colors.aslabBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.aslabPrimary,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
