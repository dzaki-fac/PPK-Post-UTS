/**
 * Peta Laboratorium — versi Portal Aslab (Sprint 4 / Programmer 2, FR-P2-06.2).
 * Memakai ulang komponen peta Sprint 3 dengan aksen Indigo.
 */
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { LabMapView } from '@/components/lab-map-view';
import { EmptyState } from '@/components/empty-state';
import { subscribeLabActivities } from '@/services/lab-activity-service';
import type { LabWithActivity } from '@/types/praktikum';
import { normalizeRoleP2 } from '@/utils/sprint4-p2-helpers';
import { useAuth } from '@/context/auth-context';

export default function PetaLabAslabScreen() {
  const { userDoc, loading } = useAuth();
  const role = normalizeRoleP2(userDoc?.peran);
  const [activities, setActivities] = useState<LabWithActivity[]>([]);
  const [selected, setSelected] = useState<LabWithActivity | null>(null);

  useEffect(() => {
    if (!loading && role !== 'aslab') router.replace('/');
  }, [loading, role]);

  useEffect(() => subscribeLabActivities(setActivities), []);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/aslab/dashboard' as Href))}
          style={({ pressed }) => [styles.backPill, pressed && styles.pressed]}>
          <Text style={styles.backPillText}>← Kembali ke Dashboard</Text>
        </Pressable>
        <Text style={styles.eyebrow}>Portal Aslab</Text>
        <Text style={styles.title}>Peta Laboratorium</Text>
        <Text style={styles.subtitle}>Sebaran laboratorium beserta aktivitas sesi terkini.</Text>
      </View>

      <View style={styles.mapWrap}>
        <LabMapView
          activities={activities}
          selectedLabId={selected?.lab.id ?? null}
          onSelectLab={setSelected}
          accentColor="#4F46E5"
        />
      </View>

      {selected ? (
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>{selected.lab.nama}</Text>
          <Text style={styles.detailMeta}>
            {[selected.lab.kode, selected.lab.gedung].filter(Boolean).join(' · ')}
          </Text>
          <Text style={styles.detailMeta}>
            {selected.ongoingSession
              ? 'Sedang Berlangsung'
              : selected.nextSession
                ? 'Akan Datang'
                : 'Tidak Ada Kegiatan'}
          </Text>
        </View>
      ) : activities.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            title="Belum Ada Laboratorium"
            message="Data laboratorium akan muncul setelah ditambahkan oleh aslab."
          />
        </View>
      ) : (
        <View style={styles.detailCard}>
          <Text style={styles.detailHint}>Pilih titik laboratorium pada peta untuk melihat detail.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    gap: 8,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingTop: 18,
    paddingBottom: 10,
  },
  backPill: {
    alignSelf: 'flex-start',
    minHeight: 40,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  backPillText: { fontSize: 12, fontWeight: '800', color: '#4F46E5' },
  eyebrow: { fontSize: 11, fontWeight: '800', color: '#4F46E5', letterSpacing: 1 },
  title: { fontSize: Platform.OS === 'web' ? 28 : 24, fontWeight: '900', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#64748B' },
  mapWrap: { flex: 1, width: '100%', maxWidth: 960, alignSelf: 'center', minHeight: 360 },
  detailCard: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginVertical: 12,
    gap: 3,
  },
  detailTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  detailMeta: { fontSize: 11, color: '#475569' },
  detailHint: { fontSize: 12, color: '#64748B' },
  emptyWrap: { maxHeight: 180 },
  pressed: { opacity: 0.75 },
});
