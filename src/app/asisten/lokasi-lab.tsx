import { Redirect, router, type Href } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/auth-context';

/**
 * Konfigurasi laboratorium (koordinat, radius, grace period, dan denda) kini dikelola
 * sepenuhnya oleh Aslab pada rute `/aslab/laboratorium` (SRS4 FR-P1-02.2).
 */
export default function AsistenLokasiLabRedirectScreen() {
  const { role } = useAuth();

  if (role === 'aslab') {
    return <Redirect href={'/aslab/laboratorium' as Href} />;
  }

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>INFORMASI HAK AKSES</Text>
        </View>
        <Text style={styles.title}>Konfigurasi Laboratorium Dikelola oleh Aslab</Text>
        <Text style={styles.description}>
          Pengaturan lokasi GPS, cakupan radius presensi, masa tenggang keterlambatan, dan
          nominal denda kini terpusat di portal Aslab agar konsisten untuk seluruh sesi praktikum.
        </Text>
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            onPress={() => router.replace('/asisten/jadwal' as Href)}>
            <Text style={styles.primaryBtnText}>← Kembali ke Jadwal Sesi</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            onPress={() => router.push('/asisten/peta-lab' as Href)}>
            <Text style={styles.secondaryBtnText}>Lihat Peta Laboratorium</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
  },
  card: {
    maxWidth: 560,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    gap: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0D9488',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  description: {
    fontSize: 13.5,
    color: '#475569',
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: '#0D9488',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
  },
  pressed: {
    opacity: 0.85,
  },
});
