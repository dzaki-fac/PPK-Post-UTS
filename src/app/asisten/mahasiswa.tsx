import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { subscribePraktikanUsers } from '@/services/attendance-service';
import { buildFallbackDefaultLabs, subscribeLabs } from '@/services/lab-service';
import { LabLocationDocument, LabMemberDocument, UserDocument } from '@/types/praktikum';

interface StudentRow {
  id: string;
  nama: string;
  nim: string;
  email: string;
  labId?: string;
  labName: string;
  kelas?: string;
}

export default function AsprakKelasSayaScreen() {
  const { userDoc } = useAuth();
  const [members, setMembers] = useState<LabMemberDocument[]>([]);
  const [users, setUsers] = useState<UserDocument[]>([]);
  const [labs, setLabs] = useState<LabLocationDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabId, setSelectedLabId] = useState<string>('semua');

  const assignedLabIds = useMemo(() => userDoc?.labIds ?? [], [userDoc?.labIds]);

  useEffect(() => {
    const unsubUsers = subscribePraktikanUsers((items) => setUsers(items));
    const unsubLabs = subscribeLabs(
      (items) => setLabs(items.length > 0 ? items : buildFallbackDefaultLabs()),
      () => setLabs(buildFallbackDefaultLabs())
    );

    const membersQuery = query(
      collection(db, 'lab_members'),
      where('role', '==', 'praktikan')
    );
    const unsubMembers = onSnapshot(
      membersQuery,
      (snap) => {
        setMembers(
          snap.docs
            .map((d) => ({
              ...(d.data() as LabMemberDocument),
              id: d.id,
            }))
            .filter((m) => m.status !== 'removed')
        );
      },
      () => setMembers([])
    );

    return () => {
      unsubUsers();
      unsubLabs();
      unsubMembers();
    };
  }, []);

  const labMap = useMemo(() => {
    const m = new Map<string, LabLocationDocument>();
    labs.forEach((l) => m.set(l.id, l));
    return m;
  }, [labs]);

  const scopedLabs = useMemo(() => {
    if (assignedLabIds.length === 0) return labs.filter((l) => l.isActive);
    return labs.filter((l) => assignedLabIds.includes(l.id));
  }, [labs, assignedLabIds]);

  const students = useMemo<StudentRow[]>(() => {
    if (members.length > 0) {
      const filteredMembers =
        assignedLabIds.length > 0
          ? members.filter((m) => assignedLabIds.includes(m.labId))
          : members;
      return filteredMembers
        .map((m) => ({
          id: m.id,
          nama: m.nama,
          nim: m.nim || '-',
          email: m.email,
          labId: m.labId,
          labName: labMap.get(m.labId)?.nama || m.labId,
        }))
        .sort((a, b) => a.nama.localeCompare(b.nama));
    }

    // Fallback ke /users bila /lab_members belum diimpor oleh Aslab
    const filteredUsers =
      assignedLabIds.length > 0
        ? users.filter((u) => u.labId && assignedLabIds.includes(u.labId))
        : users;

    return filteredUsers
      .map((u) => ({
        id: u.uid,
        nama: u.nama,
        nim: u.nim || '-',
        email: u.email,
        labId: u.labId,
        labName: (u.labId && labMap.get(u.labId)?.nama) || `Kelas ${u.kelas || '-'}`,
        kelas: u.kelas,
      }))
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [members, users, assignedLabIds, labMap]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter((s) => {
      const matchLab = selectedLabId === 'semua' || s.labId === selectedLabId;
      const matchQuery =
        !q ||
        s.nama.toLowerCase().includes(q) ||
        s.nim.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q);
      return matchLab && matchQuery;
    });
  }, [students, selectedLabId, searchQuery]);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.eyebrowRow}>
        <View style={styles.eyebrowBadge}>
          <Text style={styles.eyebrowText}>KELAS SAYA</Text>
        </View>
      </View>

      <Text style={styles.screenTitle}>Daftar Praktikan Lab Diampu</Text>
      <Text style={styles.screenSubtitle}>
        Daftar praktikan pada laboratorium yang Anda ampu.
      </Text>

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={[styles.metricVal, { color: '#0D9488' }]}>{students.length}</Text>
          <Text style={styles.metricLbl}>Total Praktikan</Text>
          <Text style={styles.metricDesc}>Lab diampu</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricVal}>{scopedLabs.length}</Text>
          <Text style={styles.metricLbl}>Lab Diampu</Text>
          <Text style={styles.metricDesc}>Aktif</Text>
        </View>
      </View>

      <TextInput
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Cari nama, NIM, atau email praktikan..."
        placeholderTextColor="#94A3B8"
      />

      {scopedLabs.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          <Pressable
            onPress={() => setSelectedLabId('semua')}
            style={[
              styles.chip,
              selectedLabId === 'semua' && styles.chipActive,
            ]}>
            <Text
              style={[
                styles.chipText,
                selectedLabId === 'semua' && styles.chipTextActive,
              ]}>
              Semua Lab
            </Text>
          </Pressable>
          {scopedLabs.map((l) => {
            const active = selectedLabId === l.id;
            return (
              <Pressable
                key={l.id}
                onPress={() => setSelectedLabId(l.id)}
                style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {l.nama}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={filteredStudents}
        extraData={`${selectedLabId}:${searchQuery}`}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader()}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.nama.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.name}>{item.nama}</Text>
              <Text style={styles.meta}>NIM: {item.nim}</Text>
              <Text style={styles.email} numberOfLines={1} ellipsizeMode="middle">
                {item.email}
              </Text>
              <View style={styles.labBadge}>
                <Text style={styles.labBadgeText} numberOfLines={1}>
                  {item.labName}
                </Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            title="Belum Ada Praktikan"
            message="Tidak ada praktikan terdaftar pada laboratorium atau kata kunci pencarian ini."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'web' ? 100 : 32,
  },
  header: {
    gap: 12,
    marginBottom: 14,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  eyebrowBadge: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0D9488',
    letterSpacing: 0.6,
  },
  readOnlyPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  readOnlyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 2,
  },
  metricVal: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  metricLbl: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  metricDesc: {
    fontSize: 11,
    color: '#64748B',
  },
  searchInput: {
    minHeight: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13.5,
    color: '#0F172A',
  },
  filterRow: {
    gap: 8,
  },
  chip: {
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0D9488',
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  meta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  email: {
    fontSize: 12,
    color: '#64748B',
  },
  labBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  labBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
});
