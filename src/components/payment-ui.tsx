/**
 * Komponen UI bersama modul Tagihan & Pembayaran (Sprint 4 / Programmer 3).
 * Mengikuti DESIGN.md: aksen Terracotta praktikan, badge status semantik, tanpa emoji,
 * radius kartu 14 / tombol 10 / pill 20, area sentuh minimal 44.
 */

import { router, type Href } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { FineStatus, PaymentStatus } from '@/types/finance';

export const PAYMENT_COLORS = {
  accent: '#EA580C',
  accentTint: '#FFF7ED',
  accentBorder: '#FED7AA',
  canvas: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  success: { dot: '#16A34A', bg: '#DCFCE7', text: '#15803D' },
  warning: { dot: '#D97706', bg: '#FEF3C7', text: '#B45309' },
  danger: { dot: '#DC2626', bg: '#FEE2E2', text: '#B91C1C' },
  neutral: { dot: '#64748B', bg: '#F1F5F9', text: '#334155' },
} as const;

interface BadgeConfig {
  label: string;
  dot: string;
  bg: string;
  text: string;
}

const FINE_BADGES: Record<FineStatus, BadgeConfig> = {
  unpaid: { label: 'Belum Dibayar', ...PAYMENT_COLORS.danger },
  pending: { label: 'Menunggu Pembayaran', ...PAYMENT_COLORS.warning },
  paid: { label: 'Lunas', ...PAYMENT_COLORS.success },
};

const PAYMENT_BADGES: Record<PaymentStatus, BadgeConfig> = {
  pending: { label: 'Menunggu', ...PAYMENT_COLORS.warning },
  success: { label: 'Berhasil', ...PAYMENT_COLORS.success },
  failed: { label: 'Gagal', ...PAYMENT_COLORS.danger },
};

function Badge({ config }: { config: BadgeConfig }) {
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeDot, { color: config.dot }]}>●</Text>
      <Text style={[styles.badgeText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

export function FineStatusBadge({ status }: { status: FineStatus }) {
  return <Badge config={FINE_BADGES[status]} />;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge config={PAYMENT_BADGES[status]} />;
}

export interface MetricItem {
  value: string;
  label: string;
  description: string;
  color?: string;
}

/** Kartu ringkasan metrik (MetricsGrid) di awal setiap halaman utama. */
export function MetricsGrid({ items }: { items: MetricItem[] }) {
  return (
    <View style={styles.metricsGrid}>
      {items.map((item) => (
        <View key={item.label} style={styles.metricCard}>
          <Text style={[styles.metricValue, item.color ? { color: item.color } : null]} numberOfLines={1}>
            {item.value}
          </Text>
          <Text style={styles.metricLabel}>{item.label}</Text>
          <Text style={styles.metricDescription}>{item.description}</Text>
        </View>
      ))}
    </View>
  );
}

export interface FilterOption<T extends string> {
  key: T;
  label: string;
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: FilterOption<T>[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.key)}
            style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Breadcrumb pill `← Kembali ...` dengan fallback bila riwayat navigasi kosong (DESIGN.md 5.2). */
export function BreadcrumbBack({ label, fallback }: { label: string; fallback: Href }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
      style={({ pressed }) => [styles.breadcrumb, pressed && styles.pressed]}>
      <Text style={styles.breadcrumbText}>← {label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeDot: { fontSize: 9 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 140,
    backgroundColor: PAYMENT_COLORS.surface,
    borderWidth: 1,
    borderColor: PAYMENT_COLORS.border,
    borderRadius: 14,
    padding: 14,
    gap: 2,
  },
  metricValue: { fontSize: 24, lineHeight: 28, fontWeight: '900', color: PAYMENT_COLORS.textPrimary },
  metricLabel: { fontSize: 12, fontWeight: '800', color: PAYMENT_COLORS.textPrimary },
  metricDescription: { fontSize: 11, color: PAYMENT_COLORS.textMuted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 20,
    justifyContent: 'center',
    backgroundColor: PAYMENT_COLORS.surface,
    borderWidth: 1,
    borderColor: PAYMENT_COLORS.border,
  },
  chipActive: {
    backgroundColor: PAYMENT_COLORS.accentTint,
    borderColor: PAYMENT_COLORS.accent,
  },
  chipText: { fontSize: 13, fontWeight: '700', color: PAYMENT_COLORS.textMuted },
  chipTextActive: { color: PAYMENT_COLORS.accent, fontWeight: '800' },
  breadcrumb: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  breadcrumbText: { fontSize: 13, fontWeight: '700', color: PAYMENT_COLORS.textSecondary },
  pressed: { opacity: 0.85 },
});
