/** Banner status perangkat yang reusable (Sprint 3 / kontrak Programmer 3). */

import React from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { DeviceStatusType } from '@/hooks/use-device-resilience';

interface DeviceStatusBannerProps {
  type: DeviceStatusType;
  message?: string;
  onRetry?: () => void;
  onOpenSettings?: () => void;
}

const STATUS_CONTENT: Record<
  DeviceStatusType,
  { title: string; description: string; tone: 'warning' | 'danger' | 'info' }
> = {
  offline: {
    title: 'Koneksi Terputus',
    description: 'Presensi dan pengiriman notifikasi memerlukan koneksi internet. Periksa jaringan Anda.',
    tone: 'danger',
  },
  location_denied: {
    title: 'Izin Lokasi Ditolak',
    description: 'Izinkan akses lokasi agar presensi dapat memverifikasi keberadaan Anda di laboratorium.',
    tone: 'danger',
  },
  gps_off: {
    title: 'Layanan Lokasi Nonaktif',
    description: 'Aktifkan GPS pada perangkat agar lokasi dapat terdeteksi saat presensi.',
    tone: 'warning',
  },
  notification_denied: {
    title: 'Notifikasi Push Nonaktif',
    description: 'Izin notifikasi ditolak. Pemberitahuan tetap dapat dipantau di Pusat Notifikasi.',
    tone: 'warning',
  },
  location_unavailable: {
    title: 'Lokasi Belum Tersedia',
    description: 'Koordinat perangkat belum diperoleh. Coba lagi setelah sinyal lokasi stabil.',
    tone: 'info',
  },
};

export function DeviceStatusBanner({
  type,
  message,
  onRetry,
  onOpenSettings,
}: DeviceStatusBannerProps) {
  const content = STATUS_CONTENT[type];
  const openSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
      return;
    }
    Linking.openSettings().catch(() => {});
  };

  return (
    <View
      style={[
        styles.container,
        content.tone === 'danger' && styles.danger,
        content.tone === 'warning' && styles.warning,
        content.tone === 'info' && styles.info,
      ]}>
      <View style={styles.indicator}>
        <Text style={styles.indicatorText}>!</Text>
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.description}>{message ?? content.description}</Text>
        <View style={styles.actions}>
          {type === 'location_denied' || type === 'gps_off' ? (
            <Pressable style={styles.action} onPress={openSettings} accessibilityRole="button">
              <Text style={styles.actionText}>Buka Pengaturan</Text>
            </Pressable>
          ) : null}
          {onRetry ? (
            <Pressable style={styles.action} onPress={onRetry} accessibilityRole="button">
              <Text style={styles.actionText}>Coba Lagi</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  danger: { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
  warning: { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
  info: { backgroundColor: '#DBEAFE', borderColor: '#BFDBFE' },
  indicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorText: { color: '#B91C1C', fontWeight: '800', fontSize: 14 },
  textWrap: { flex: 1 },
  title: { color: '#0F172A', fontWeight: '800', fontSize: 14, marginBottom: 3 },
  description: { color: '#334155', fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  action: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  actionText: { color: '#0F172A', fontSize: 12, fontWeight: '700' },
});
