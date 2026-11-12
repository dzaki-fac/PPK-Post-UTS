import { router, type Href } from 'expo-router';
import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmationModal } from '@/components/confirmation-modal';
import { useAuth } from '@/context/auth-context';

export function RoleHeader() {
  const insets = useSafeAreaInsets();
  const { userDoc, role, logout } = useAuth();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isPraktikan = role === 'praktikan';
  const name = userDoc?.nama ?? (isPraktikan ? 'Praktikan' : 'Asisten');
  const subInfo = isPraktikan
    ? `Kelas ${userDoc?.kelas ?? '-'}`
    : userDoc?.peranLab ?? 'Pengampu Lab';

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setLogoutModalVisible(false);
      router.replace('/login' as Href);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <View style={styles.topNavbar}>
      <View
        style={[
          styles.navInner,
          {
            paddingTop: Platform.OS === 'web' ? 12 : Math.max(insets.top - 4, 10),
            paddingBottom: 12,
          },
        ]}>
        {/* Brand Group */}
        <Pressable
          style={({ pressed }) => [styles.brandRow, pressed && styles.btnPressed]}
          onPress={() =>
            router.replace(
              (isPraktikan ? '/praktikan/jadwal' : '/asisten/jadwal') as Href
            )
          }
          accessibilityRole="button"
          accessibilityLabel="PPK LabPortal Beranda">
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>PPK</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>PPK LabPortal</Text>
            <Text style={styles.brandSubtitle}>Presensi & Manajemen Sesi</Text>
          </View>
        </Pressable>

        {/* Right Group: User Profile Badge & Logout Button */}
        <View style={styles.rightGroup}>
          <View
            style={[
              styles.userPill,
              isPraktikan ? styles.userPillPraktikan : styles.userPillAsisten,
            ]}>
            <View
              style={[
                styles.roleMiniBadge,
                isPraktikan ? styles.roleMiniPraktikan : styles.roleMiniAsisten,
              ]}>
              <Text
                style={[
                  styles.roleMiniText,
                  isPraktikan ? styles.textPraktikan : styles.textAsisten,
                ]}>
                {isPraktikan ? 'MAHASISWA' : 'ASISTEN'}
              </Text>
            </View>
            <View style={styles.userInfoWrap}>
              <Text style={styles.userName} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.userSub} numberOfLines={1}>
                {subInfo}
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.btnPressed]}
            onPress={() => setLogoutModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Keluar dari akun">
            <Text style={styles.logoutBtnText}>Keluar</Text>
          </Pressable>
        </View>
      </View>

      <ConfirmationModal
        visible={logoutModalVisible}
        title="Keluar dari Akun?"
        description="Sesi akun Anda saat ini akan diakhiri dan Anda akan diarahkan kembali ke halaman masuk."
        confirmText="Ya, Keluar"
        cancelText="Batal"
        confirmVariant="danger"
        isLoading={loggingOut}
        onConfirm={handleConfirmLogout}
        onCancel={() => setLogoutModalVisible(false)}>
        <View style={styles.accountSummary}>
          <Text style={styles.summaryName}>{name}</Text>
          <Text style={styles.summaryMeta}>{userDoc?.email ?? '-'}</Text>
          {isPraktikan ? (
            <Text style={styles.summaryMeta}>
              NIM: {userDoc?.nim ?? '-'} • Kelas {userDoc?.kelas ?? '-'}
            </Text>
          ) : (
            <Text style={styles.summaryMeta}>{subInfo}</Text>
          )}
        </View>
      </ConfirmationModal>
    </View>
  );
}

const styles = StyleSheet.create({
  topNavbar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    zIndex: 10,
  },
  navInner: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#EA580C',
    letterSpacing: 0.5,
  },
  brandTitle: {
    fontSize: Platform.OS === 'web' ? 15 : 13.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: 210,
  },
  userPillPraktikan: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  userPillAsisten: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  userInfoWrap: {
    gap: 1,
  },
  userName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: Platform.OS === 'web' ? 140 : 100,
  },
  userSub: {
    fontSize: 10,
    color: '#64748B',
  },
  roleMiniBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  roleMiniPraktikan: {
    backgroundColor: '#FED7AA',
  },
  roleMiniAsisten: {
    backgroundColor: '#99F6E4',
  },
  roleMiniText: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  textPraktikan: {
    color: '#9A3412',
  },
  textAsisten: {
    color: '#0F766E',
  },
  logoutBtn: {
    minHeight: 44,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  btnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  accountSummary: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    gap: 3,
  },
  summaryName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  summaryMeta: {
    fontSize: 12,
    color: '#475569',
  },
});
