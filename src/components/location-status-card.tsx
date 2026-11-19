import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  formatDistanceMeters,
  openDeviceLocationSettings,
} from '@/services/location-service';
import { LabLocationDocument, LocationVerificationResult } from '@/types/praktikum';

interface LocationStatusCardProps {
  lab: LabLocationDocument | null;
  allowedRadiusMeters: number;
  result: LocationVerificationResult | null;
  checking: boolean;
  onRefresh: () => void;
  accentColor?: string;
}

export function LocationStatusCard({
  lab,
  allowedRadiusMeters,
  result,
  checking,
  onRefresh,
  accentColor = '#EA580C',
}: LocationStatusCardProps) {
  const status = checking ? 'checking' : result?.status ?? 'unavailable';

  const badgeConfig = (() => {
    switch (status) {
      case 'checking':
        return {
          label: 'MEMERIKSA GPS',
          bg: '#FEF3C7',
          text: '#B45309',
          border: '#FDE68A',
          dot: '#D97706',
        };
      case 'within_radius':
        return {
          label: 'DALAM RADIUS',
          bg: '#DCFCE7',
          text: '#15803D',
          border: '#BBF7D0',
          dot: '#16A34A',
        };
      case 'outside_radius':
        return {
          label: 'DI LUAR RADIUS',
          bg: '#FEE2E2',
          text: '#B91C1C',
          border: '#FECACA',
          dot: '#DC2626',
        };
      case 'permission_denied':
        return {
          label: 'IZIN DITOLAK',
          bg: '#FEE2E2',
          text: '#B91C1C',
          border: '#FECACA',
          dot: '#DC2626',
        };
      case 'services_disabled':
        return {
          label: 'GPS NONAKTIF',
          bg: '#FEF3C7',
          text: '#B45309',
          border: '#FDE68A',
          dot: '#D97706',
        };
      default:
        return {
          label: 'LOKASI BELUM TERSEDIA',
          bg: '#FEF3C7',
          text: '#B45309',
          border: '#FDE68A',
          dot: '#D97706',
        };
    }
  })();

  const showOpenSettings =
    Platform.OS !== 'web' &&
    !checking &&
    (status === 'permission_denied' || status === 'services_disabled');

  const distanceMeters = result?.distanceMeters;
  const hasDistance = distanceMeters !== undefined && Number.isFinite(distanceMeters);

  // Proporsi jarak terhadap batas radius untuk visual gauge (capped 100%)
  const progressPercent = hasDistance
    ? Math.min(100, Math.max(4, Math.round((distanceMeters / Math.max(allowedRadiusMeters, 1)) * 100)))
    : 0;

  return (
    <View style={styles.card}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.eyebrow}>VERIFIKASI LOKASI GEOFENCING</Text>
          <Text style={styles.labTitle} numberOfLines={2}>
            {lab ? `${lab.nama} (${lab.kode})` : 'Menentukan Laboratorium Acuan'}
          </Text>
          {lab?.gedung ? (
            <Text style={styles.labSub} numberOfLines={1}>
              {lab.gedung}
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: badgeConfig.bg, borderColor: badgeConfig.border },
          ]}>
          <Text style={[styles.statusBadgeText, { color: badgeConfig.text }]}>
            {badgeConfig.label}
          </Text>
        </View>
      </View>

      {/* Main Distance / Loading Box */}
      {checking ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={accentColor} />
          <View style={styles.loadingTextWrap}>
            <Text style={styles.loadingTitle}>Mengambil koordinat GPS perangkat...</Text>
            <Text style={styles.loadingSub}>
              Menghitung jarak aktual terhadap titik pusat laboratorium.
            </Text>
          </View>
        </View>
      ) : hasDistance ? (
        <View
          style={[
            styles.distanceBox,
            status === 'within_radius' ? styles.distanceBoxValid : styles.distanceBoxInvalid,
          ]}>
          <View style={styles.distanceMetricsRow}>
            <View style={styles.distanceMetricItem}>
              <Text style={styles.distanceMetricLabel}>Jarak Anda Saat Ini</Text>
              <Text
                style={[
                  styles.distanceMetricValue,
                  { color: status === 'within_radius' ? '#15803D' : '#B91C1C' },
                ]}>
                {formatDistanceMeters(distanceMeters)}
              </Text>
            </View>
            <View style={styles.distanceMetricDivider} />
            <View style={styles.distanceMetricItem}>
              <Text style={styles.distanceMetricLabel}>Batas Radius Lab</Text>
              <Text style={styles.distanceMetricRadius}>{allowedRadiusMeters} meter</Text>
            </View>
          </View>

          <View style={styles.gaugeTrack}>
            <View
              style={[
                styles.gaugeFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: status === 'within_radius' ? '#16A34A' : '#DC2626',
                },
              ]}
            />
          </View>

          <Text style={styles.distanceSummaryLine}>
            {formatDistanceMeters(distanceMeters)} dari {lab?.nama ?? 'Laboratorium'} • Batas radius:{' '}
            {allowedRadiusMeters} meter
          </Text>

          {result?.latitude !== undefined && result?.longitude !== undefined ? (
            <Text style={styles.coordsMeta}>
              Posisi Anda: {result.latitude.toFixed(5)}, {result.longitude.toFixed(5)}
              {result.accuracy !== undefined ? ` • Akurasi +/- ${Math.round(result.accuracy)} m` : ''}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.alertBox}>
          <Text style={styles.alertTitle}>
            {status === 'permission_denied'
              ? 'Izin Lokasi Perangkat Diperlukan'
              : status === 'services_disabled'
              ? 'Layanan Lokasi (GPS) Tidak Aktif'
              : 'Koordinat Lokasi Belum Tersedia'}
          </Text>
          <Text style={styles.alertMessage}>
            {result?.message ??
              'Tekan tombol Periksa Ulang Lokasi untuk mendeteksi posisi Anda terhadap laboratorium.'}
          </Text>
        </View>
      )}

      {/* Detail explanation message when distance exists */}
      {!checking && hasDistance && result?.message ? (
        <Text
          style={[
            styles.explanationText,
            { color: status === 'within_radius' ? '#166534' : '#991B1B' },
          ]}>
          {result.message}
        </Text>
      ) : null}

      {/* Actions */}
      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Periksa Ulang Lokasi"
          onPress={onRefresh}
          disabled={checking}
          style={({ pressed }) => [
            styles.refreshBtn,
            { borderColor: accentColor },
            pressed && !checking && styles.btnPressed,
            checking && styles.btnDisabled,
          ]}>
          <Text style={[styles.refreshBtnText, { color: accentColor }]}>
            {checking ? 'Memeriksa Lokasi...' : 'Periksa Ulang Lokasi'}
          </Text>
        </Pressable>

        {showOpenSettings ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buka Pengaturan Perangkat"
            onPress={() => {
              openDeviceLocationSettings();
            }}
            style={({ pressed }) => [
              styles.settingsBtn,
              pressed && styles.btnPressed,
            ]}>
            <Text style={styles.settingsBtnText}>Buka Pengaturan</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  labTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20,
  },
  labSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loadingTextWrap: {
    flex: 1,
    gap: 2,
  },
  loadingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  loadingSub: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },
  distanceBox: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    gap: 8,
  },
  distanceBoxValid: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  distanceBoxInvalid: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  distanceMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  distanceMetricItem: {
    flex: 1,
    gap: 2,
  },
  distanceMetricDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#CBD5E1',
  },
  distanceMetricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  distanceMetricValue: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
  },
  distanceMetricRadius: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 24,
  },
  gaugeTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 4,
  },
  distanceSummaryLine: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  coordsMeta: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  alertBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 4,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  alertMessage: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
  },
  explanationText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  refreshBtn: {
    flex: 1,
    minHeight: 44,
    minWidth: 140,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  settingsBtn: {
    flex: 1,
    minHeight: 44,
    minWidth: 130,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  settingsBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.84,
  },
  btnDisabled: {
    opacity: 0.55,
  },
});
