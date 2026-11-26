/**
 * Kelas Saya — Sprint 4 / Programmer 2 (FR-P2-03.5).
 * Menggantikan halaman "Kelola Pengguna": Asprak hanya membaca anggota
 * laboratorium yang diampu. Tidak ada aksi create/update/delete anggota.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { router } from 'expo-router';

import { MetricsGrid } from '@/components/dashboard/metrics-grid';
import { EmptyState } from '@/components/empty-state';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import type { Sprint4MemberDocument } from '@/types/sprint4-p2';
import { getUserLabIds, normalizeRoleP2 } from '@/utils/sprint4-p2-helpers';

export default function KelasSayaScreen() {
  const { userDoc, loading } = useAuth();
  const peran = normalizeRoleP2(userDoc?.peran);
  const labIds = useMemo(() => getUserLabIds(userDoc), [userDoc]);
  const [members, setMembers] = useState<Sprint4MemberDocument[]>([]);
  const [ready, setReady] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'praktikan' | 'asprak'>('praktikan');
  const [cari, setCari] = useState('');

  useEffect(() => {
    if (!loading && peran !== 'asprak') router.replace('/');
  }, [loading, peran]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'lab_members'),
      (snapshot) => {
        const items: Sprint4MemberDocument[] = [];
        snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as Sprint4MemberDocument));
        setMembers(items);
        setReady(true);
      },
      (error) => {
        console.warn('Gagal memuat anggota laboratorium:', error);
        setReady(true);
      }
    );
    return unsubscribe;
  }, []);

  const scoped = useMemo(
    () =>
      members.filter(
        (m) =>
          m.status !== 'removed' &&
          m.role === roleFilter &&
          (labIds.length === 0 || labIds.includes(m.labId))
      ),
    [members, labIds, roleFilter]
  );

  const ditampilkan = useMemo(() => {
    const keyword = cari.trim().toLowerCase();
    if (!keyword) return scoped;
    return scoped.filter((m) =>
      [m.nama, m.nim, m.email].some((value) => value?.toLowerCase().includes(keyword))
    );
  }, [scoped, cari]);

  const totalPraktikan = members.filter(
    (m) => m.role === 'praktikan' && m.status !== 'removed' && (labIds.length === 0 || labIds.includes(m.labId))
  ).length;
  const totalAsprak = members.filter(
    (m) => m.role === 'asprak' && m.status !== 'removed' && (labIds.length === 0 || labIds.includes(m.labId))
  ).length;

  if (loading || !ready) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#0D9488" />
        <Text style={styles.loadingText}>Memuat anggota laboratorium...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={ditampilkan}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Portal Asprak</Text>
            <Text style={styles.title}>Kelas Saya</Text>
            <Text style={styles.subtitle}>
              Daftar anggota laboratorium yang Anda ampuh. Data bersifat baca saja.
            </Text>
            <MetricsGrid
              items={[
                { label: 'Laboratorium Diampu', value: labIds.length, tint: 'teal' },
                { label: 'Praktikan', value: totalPraktikan, tint: 'default' },
                { label: 'Asprak', value: totalAsprak, tint: 'blue' },
                { label: 'Data Ditampilkan', value: ditampilkan.length, tint: 'indigo' },
              ]}
            />
            <View style={styles.segment}>
              {(['praktikan', 'asprak'] as const).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setRoleFilter(option)}
                  style={({ pressed }) => [
                    styles.segmentButton,
                    roleFilter === option && styles.segmentButtonActive,
                    pressed && styles.pressed,
                  ]}>
                  <Text
                    style={[
                      styles.segmentText,
                      roleFilter === option && styles.segmentTextActive,
                    ]}>
                    {option === 'praktikan' ? 'Praktikan' : 'Asprak'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={cari}
              onChangeText={setCari}
              placeholder="Cari nama, NIM, atau email"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
            />
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.memberRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(item.nama || 'A').slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{item.nama}</Text>
              <Text style={styles.memberMeta}>
                {[item.nim && `NIM ${item.nim}`, item.email].filter(Boolean).join(' · ') || '-'}
              </Text>
              <Text style={styles.memberLab}>Lab: {item.labId}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            title="Belum Ada Anggota"
            message="Anggota laboratorium akan muncul setelah didistribusikan oleh aslab."
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 13, color: '#64748B' },
  listContent: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingBottom: 90,
    gap: 10,
  },
  header: { gap: 12, paddingTop: 18 },
  eyebrow: { fontSize: 11, fontWeight: '800', color: '#0D9488', letterSpacing: 1 },
  title: { fontSize: Platform.OS === 'web' ? 28 : 24, fontWeight: '900', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B' },
  segment: { flexDirection: 'row', gap: 8 },
  segmentButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  segmentButtonActive: { backgroundColor: '#F0FDFA', borderColor: '#0D9488' },
  segmentText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  segmentTextActive: { color: '#0D9488', fontWeight: '800' },
  searchInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '900', color: '#0D9488' },
  memberInfo: { flex: 1, gap: 2 },
  memberName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  memberMeta: { fontSize: 11, color: '#64748B' },
  memberLab: { fontSize: 10, color: '#0D9488' },
  pressed: { opacity: 0.75 },
});
