import { router, type Href } from 'expo-router';
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/auth-context';

// TODO(P2): Lengkapi ringkasan kehadiran global & status denda lintas lab pada modul Programmer 2.
export default function AslabDashboardScreen() {
  const { userDoc } = useAuth();

  const shortcuts: { title: string; subtitle: string; route: Href; actionLabel: string }[] = [
    {
      title: 'Manajemen Laboratorium & Denda',
      subtitle: 'Tambah lab baru, atur radius GPS, masa tenggang keterlambatan, dan nominal denda.',
      route: '/aslab/laboratorium' as Href,
      actionLabel: 'Kelola Lab',
    },
    {
      title: 'Daftar Anggota & Pindah Lab',
      subtitle: 'Kelola praktikan dan asprak per mata kuliah serta pindahkan anggota antar-lab.',
      route: '/aslab/anggota' as Href,
      actionLabel: 'Kelola Anggota',
    },
    {
      title: 'Impor & Generator Laboratorium',
      subtitle: 'Buat banyak laboratorium sekaligus atau unggah data lab dari template CSV/XLSX.',
      route: '/aslab/impor-lab' as Href,
      actionLabel: 'Buka Impor Lab',
    },
    {
      title: 'Impor Massal Praktikan',
      subtitle: 'Review dan simpan daftar praktikan dengan deteksi duplikat NIM dan konflik lab.',
      route: '/aslab/impor-praktikan' as Href,
      actionLabel: 'Impor Praktikan',
    },
    {
      title: 'Impor Massal Asprak',
      subtitle: 'Daftarkan asisten praktikum ke lab pengampu beserta penautan akun otomatis.',
      route: '/aslab/impor-asprak' as Href,
      actionLabel: 'Impor Asprak',
    },
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.inner}>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>PANEL KOORDINATOR ASLAB</Text>
        </View>
        <Text style={styles.title}>Dasbor Manajemen Praktikum</Text>
        <Text style={styles.subtitle}>
          Selamat datang, {userDoc?.nama ?? 'Aslab'}. Kelola konfigurasi lab, kuota denda, dan anggota mata kuliah Anda.
        </Text>

        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Akses Cepat Programmer 1</Text>
          <Text style={styles.noticeBody}>
            Statistik lintas sesi global akan ditambahkan pada modul dasbor lanjutan. Gunakan pintasan di bawah untuk mengelola laboratorium dan anggota.
          </Text>
        </View>

        <View style={styles.grid}>
          {shortcuts.map((item) => (
            <Pressable
              key={item.title}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => router.push(item.route)}>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSub}>{item.subtitle}</Text>
              </View>
              <View style={styles.cardActionPill}>
                <Text style={styles.cardActionText}>{item.actionLabel} →</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingVertical: 16,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingBottom: Platform.OS === 'web' ? 96 : 32,
  },
  inner: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  headerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13.5,
    color: '#64748B',
    lineHeight: 20,
  },
  noticeCard: {
    marginTop: 14,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 14,
    padding: 14,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3730A3',
  },
  noticeBody: {
    marginTop: 4,
    fontSize: 12.5,
    color: '#4338CA',
    lineHeight: 18,
  },
  grid: {
    marginTop: 14,
    gap: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardBody: {
    gap: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSub: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },
  cardActionPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minHeight: 40,
    justifyContent: 'center',
  },
  cardActionText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
