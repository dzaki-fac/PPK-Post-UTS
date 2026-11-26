/**
 * Landing LabPortal — Sprint 4 / Programmer 2 (FR-P2-06.1).
 * Menampilkan tiga kartu portal (Praktikan, Asprak, Aslab) dengan identitas warna masing-masing.
 */
import { Redirect, router, type Href } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/auth-context';
import { normalizeRoleP2 } from '@/utils/sprint4-p2-helpers';

const PORTALS = [
  {
    key: 'praktikan',
    label: 'PRAKTIKAN',
    title: 'Portal Praktikan',
    subtitle: 'Lihat jadwal, presensi, izin, dan tagihan denda.',
    route: '/praktikan/jadwal' as Href,
    primary: '#EA580C',
    tint: '#FFF7ED',
    border: '#FED7AA',
  },
  {
    key: 'asprak',
    label: 'ASPRAK',
    title: 'Portal Asprak',
    subtitle: 'Buka sesi, pantau presensi, dan kelola izin laboratorium.',
    route: '/asisten/jadwal' as Href,
    primary: '#0D9488',
    tint: '#F0FDFA',
    border: '#99F6E4',
  },
  {
    key: 'aslab',
    label: 'ASLAB',
    title: 'Portal Aslab',
    subtitle: 'Kelola laboratorium, distribusi anggota, dan dashboard keuangan.',
    route: '/aslab/dashboard' as Href,
    primary: '#4F46E5',
    tint: '#EEF2FF',
    border: '#C7D2FE',
  },
] as const;

export default function IndexScreen() {
  const { user, userDoc, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeText}>PPK</Text>
        </View>
        <ActivityIndicator size="large" color="#EA580C" />
        <Text style={styles.loadingText}>Memuat sesi LabPortal...</Text>
      </View>
    );
  }

  if (!user || !userDoc) {
    return <Redirect href={'/login' as Href} />;
  }

  const currentRole = normalizeRoleP2(userDoc.peran);
  const ownPortal = PORTALS.find((portal) => portal.key === currentRole) ?? PORTALS[1];

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.brandRow}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeText}>PPK</Text>
        </View>
        <View>
          <Text style={styles.brandTitle}>LabPortal</Text>
          <Text style={styles.brandSubtitle}>Praktikum Pengembangan Platform Khusus</Text>
        </View>
      </View>

      <Text style={styles.eyebrow}>Selamat datang, {userDoc.nama || 'Pengguna'}</Text>
      <Text style={styles.title}>Pilih Portal</Text>
      <Text style={styles.subtitle}>
        Setiap peran memiliki lingkup akses dan tanggung jawab yang berbeda.
      </Text>

      <Pressable
        onPress={() => router.replace(ownPortal.route)}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
        <Text style={styles.primaryButtonText}>Lanjut ke Portal Saya</Text>
      </Pressable>
      <Text style={styles.currentRole}>Peran Anda: {ownPortal.label}</Text>

      <View style={styles.portalGrid}>
        {PORTALS.map((portal) => {
          const isOwn = portal.key === currentRole;
          return (
            <Pressable
              key={portal.key}
              onPress={() => router.push(portal.route)}
              style={({ pressed }) => [
                styles.portalCard,
                { backgroundColor: portal.tint, borderColor: portal.border },
                pressed && styles.pressed,
              ]}>
              <View style={[styles.portalBadge, { backgroundColor: portal.primary }]}>
                <Text style={styles.portalBadgeText}>{portal.label}</Text>
              </View>
              <Text style={[styles.portalTitle, { color: portal.primary }]}>{portal.title}</Text>
              <Text style={styles.portalSubtitle}>{portal.subtitle}</Text>
              <Text style={[styles.portalLink, { color: portal.primary }]}>
                {isOwn ? 'Portal Anda →' : 'Buka portal →'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingTop: 28,
    paddingBottom: 60,
    gap: 12,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 20,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeText: { fontSize: 16, fontWeight: '900', color: '#EA580C', letterSpacing: 0.6 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  brandSubtitle: { fontSize: 11, color: '#64748B' },
  eyebrow: { fontSize: 12, fontWeight: '700', color: '#64748B', marginTop: 12 },
  title: { fontSize: Platform.OS === 'web' ? 32 : 28, fontWeight: '900', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B' },
  primaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#0F172A' },
  primaryButtonText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  currentRole: { fontSize: 11, fontWeight: '700', color: '#64748B', textAlign: 'center' },
  portalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  portalCard: {
    flex: 1,
    minWidth: 240,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    elevation: 1,
  },
  portalBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  portalBadgeText: { fontSize: 9, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.6 },
  portalTitle: { fontSize: 17, fontWeight: '900' },
  portalSubtitle: { fontSize: 12, color: '#475569' },
  portalLink: { fontSize: 12, fontWeight: '800', marginTop: 4 },
  loadingText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  pressed: { opacity: 0.8 },
});
