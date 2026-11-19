import { router } from 'expo-router';
import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { LabWithActivity, UserRole } from '@/types/praktikum';

interface LabActivitySheetProps {
  activity: LabWithActivity;
  role: UserRole;
  userClass?: 'A' | 'B';
  onClose: () => void;
  onNavigateToSession?: (sessionId: string) => void;
}

export function LabActivitySheet({
  activity,
  role,
  userClass,
  onClose,
  onNavigateToSession,
}: LabActivitySheetProps) {
  const { lab, ongoingSession, nextSession, distanceMeters, isUserInsideRadius } = activity;
  const isPraktikan = role === 'praktikan';
  const accentColor = isPraktikan ? '#EA580C' : '#0D9488';
  const accentTint = isPraktikan ? '#FFF7ED' : '#F0FDFA';
  const accentBorder = isPraktikan ? '#FED7AA' : '#99F6E4';

  const handleOpenSession = (sessionId: string) => {
    if (onNavigateToSession) {
      onNavigateToSession(sessionId);
      return;
    }
    if (isPraktikan) {
      router.push(`/praktikan/detail-sesi/${sessionId}` as any);
    } else {
      router.push(`/asisten/detail-sesi/${sessionId}` as any);
    }
  };

  const isClassMatch = !userClass || !ongoingSession
    ? true
    : ongoingSession.kelas.includes(userClass);

  return (
    <View style={styles.sheetContainer}>
      {/* Header Panel */}
      <View style={styles.sheetHeader}>
        <View style={styles.headerTitleWrap}>
          <View style={styles.titleRow}>
            <Text style={styles.labName} numberOfLines={1}>
              {lab.nama}
            </Text>
            <View style={[styles.codeBadge, { backgroundColor: accentTint, borderColor: accentBorder }]}>
              <Text style={[styles.codeText, { color: accentColor }]}>{lab.kode}</Text>
            </View>
          </View>
          <Text style={styles.labGedung}>{lab.gedung}</Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          accessibilityLabel="Tutup panel detail lab"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.sheetBody}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.bodyContent}>
        {/* Radius & Distance Pill Row */}
        <View style={styles.metaRow}>
          <View style={styles.metaBadge}>
            <Text style={styles.metaLabel}>Radius Presensi:</Text>
            <Text style={styles.metaValue}>{lab.radiusMeter} meter</Text>
          </View>

          {distanceMeters !== undefined ? (
            <View
              style={[
                styles.distanceBadge,
                isUserInsideRadius ? styles.withinRadiusBadge : styles.outsideRadiusBadge,
              ]}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isUserInsideRadius ? '#16A34A' : '#DC2626' },
                ]}
              />
              <Text
                style={[
                  styles.distanceText,
                  { color: isUserInsideRadius ? '#15803D' : '#B91C1C' },
                ]}>
                {distanceMeters}m ({isUserInsideRadius ? 'Di Dalam Radius' : 'Di Luar Radius'})
              </Text>
            </View>
          ) : (
            <View style={styles.metaBadge}>
              <Text style={styles.metaMuted}>Lokasi belum aktif</Text>
            </View>
          )}
        </View>

        {lab.deskripsi ? (
          <Text style={styles.labDescription}>{lab.deskripsi}</Text>
        ) : null}

        {/* Section 1: Praktikum Sedang Berlangsung */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIndicatorDot, { backgroundColor: ongoingSession ? '#16A34A' : '#64748B' }]} />
            <Text style={styles.sectionTitle}>PRAKTIKUM SEDANG BERLANGSUNG</Text>
          </View>

          {ongoingSession ? (
            <View style={[styles.sessionCard, styles.ongoingCard]}>
              <View style={styles.sessionTopRow}>
                <View style={styles.sessionTitleGroup}>
                  <Text style={styles.sessionName}>{ongoingSession.praktikum}</Text>
                  <View style={styles.classPill}>
                    <Text style={styles.classText}>{ongoingSession.kelas}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    ongoingSession.status === 'dibuka'
                      ? styles.statusOpen
                      : styles.statusOngoing,
                  ]}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          ongoingSession.status === 'dibuka' ? '#16A34A' : '#0284C7',
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          ongoingSession.status === 'dibuka' ? '#15803D' : '#0369A1',
                      },
                    ]}>
                    {ongoingSession.status === 'dibuka' ? 'DIBUKA' : 'BERJALAN'}
                  </Text>
                </View>
              </View>

              {ongoingSession.materi ? (
                <View style={styles.materiBlock}>
                  <Text style={styles.materiLabel}>Materi:</Text>
                  <Text style={styles.materiValue}>{ongoingSession.materi}</Text>
                </View>
              ) : null}

              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleLabel}>Waktu:</Text>
                <Text style={styles.scheduleValue}>
                  {ongoingSession.waktuMulai} - {ongoingSession.waktuSelesai} WIB
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                {isPraktikan ? (
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      { backgroundColor: accentColor },
                      !isClassMatch && styles.disabledButton,
                    ]}
                    onPress={() => handleOpenSession(ongoingSession.id)}>
                    <Text style={styles.primaryButtonText}>
                      {ongoingSession.status === 'dibuka'
                        ? 'Buka Form Presensi →'
                        : 'Lihat Detail Sesi →'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: accentColor }]}
                    onPress={() => handleOpenSession(ongoingSession.id)}>
                    <Text style={styles.primaryButtonText}>Kelola Sesi Ini →</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.emptySessionBox}>
              <View style={styles.emptyDot} />
              <Text style={styles.emptySessionText}>
                Tidak ada praktikum aktif di laboratorium ini saat ini.
              </Text>
            </View>
          )}
        </View>

        {/* Section 2: Praktikum Berikutnya */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIndicatorDot, { backgroundColor: '#2563EB' }]} />
            <Text style={styles.sectionTitle}>PRAKTIKUM BERIKUTNYA</Text>
          </View>

          {nextSession ? (
            <View style={[styles.sessionCard, styles.upcomingCard]}>
              <View style={styles.sessionTopRow}>
                <View style={styles.sessionTitleGroup}>
                  <Text style={styles.sessionName}>{nextSession.praktikum}</Text>
                  <View style={styles.classPill}>
                    <Text style={styles.classText}>{nextSession.kelas}</Text>
                  </View>
                </View>
                <View style={[styles.statusPill, styles.statusWaiting]}>
                  <View style={[styles.statusDot, { backgroundColor: '#EAB308' }]} />
                  <Text style={[styles.statusText, { color: '#B45309' }]}>
                    BELUM DIBUKA
                  </Text>
                </View>
              </View>

              {nextSession.materi ? (
                <View style={styles.materiBlock}>
                  <Text style={styles.materiLabel}>Materi:</Text>
                  <Text style={styles.materiValue}>{nextSession.materi}</Text>
                </View>
              ) : null}

              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleLabel}>Jadwal:</Text>
                <Text style={styles.scheduleValue}>
                  {nextSession.tanggal} • {nextSession.waktuMulai} - {nextSession.waktuSelesai} WIB
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: accentColor }]}
                onPress={() => handleOpenSession(nextSession.id)}>
                <Text style={[styles.secondaryButtonText, { color: accentColor }]}>
                  Lihat Jadwal Lengkap →
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptySessionBox}>
              <View style={styles.emptyDot} />
              <Text style={styles.emptySessionText}>
                Belum ada jadwal praktikum berikutnya yang terdaftar di lab ini.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: Platform.OS === 'web' ? 440 : 380,
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleWrap: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  codeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  codeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  labGedung: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  sheetBody: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 14,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  metaLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '700',
  },
  metaMuted: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  withinRadiusBadge: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  outsideRadiusBadge: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '700',
  },
  labDescription: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  ongoingCard: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  upcomingCard: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  sessionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  sessionTitleGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  sessionName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  classPill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  classText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  statusOpen: {
    backgroundColor: '#DCFCE7',
  },
  statusOngoing: {
    backgroundColor: '#E0F2FE',
  },
  statusWaiting: {
    backgroundColor: '#FEF3C7',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  materiBlock: {
    flexDirection: 'row',
    gap: 4,
  },
  materiLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  materiValue: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  scheduleRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  scheduleLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  scheduleValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionRow: {
    marginTop: 4,
  },
  primaryButton: {
    minHeight: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.6,
  },
  secondaryButton: {
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    marginTop: 2,
  },
  secondaryButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  emptySessionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
  emptySessionText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
});
