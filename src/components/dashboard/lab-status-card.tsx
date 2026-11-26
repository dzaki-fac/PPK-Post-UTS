import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { DashboardLabStatus } from '@/types/sprint4-p2';

const STATUS: Record<
  DashboardLabStatus['status'],
  { label: string; color: string; bg: string; border: string }
> = {
  berlangsung: { label: 'Berlangsung', color: '#15803D', bg: '#DCFCE7', border: '#86EFAC' },
  terjadwal: { label: 'Terjadwal', color: '#1D4ED8', bg: '#DBEAFE', border: '#93C5FD' },
  'tidak-ada-kegiatan': {
    label: 'Tidak Ada Kegiatan',
    color: '#475569',
    bg: '#F1F5F9',
    border: '#E2E8F0',
  },
};

export function LabStatusCard({ item }: { item: DashboardLabStatus }) {
  const status = STATUS[item.status];
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{item.namaLab}</Text>
          {item.gedung ? <Text style={styles.gedung}>{item.gedung}</Text> : null}
        </View>
        <View style={[styles.badge, { backgroundColor: status.bg, borderColor: status.border }]}>
          <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
      <View style={styles.details}>
        <Text style={styles.detail}>
          Praktikan <Text style={styles.detailValue}>{item.totalPraktikan}</Text>
        </Text>
        <Text style={styles.detail}>
          Asprak <Text style={styles.detailValue}>{item.totalAsprak}</Text>
        </Text>
        {item.waktu ? <Text style={styles.detail}>Mulai {item.waktu} WIB</Text> : null}
      </View>
      {item.kehadiranSesiBerjalan ? (
        <View style={styles.progressBlock}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(
                    100,
                    item.kehadiranSesiBerjalan.total > 0
                      ? (item.kehadiranSesiBerjalan.hadir / item.kehadiranSesiBerjalan.total) * 100
                      : 0
                  )}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            Hadir {item.kehadiranSesiBerjalan.hadir}/{item.kehadiranSesiBerjalan.total} · Terlambat{' '}
            {item.kehadiranSesiBerjalan.terlambat}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    elevation: 1,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  titleWrap: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  gedung: { fontSize: 11, color: '#64748B' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 9, fontWeight: '800' },
  details: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  detail: { fontSize: 11, color: '#475569' },
  detailValue: { fontWeight: '900', color: '#0F172A' },
  progressBlock: { marginTop: 10, gap: 5 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: '#E2E8F0', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#16A34A' },
  progressText: { fontSize: 10, color: '#64748B' },
});
