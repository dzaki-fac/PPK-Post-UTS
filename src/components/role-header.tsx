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
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { getHomeRouteByRole, getRoleDisplayLabel } from '@/utils/role';

export function RoleHeader() {
  const insets = useSafeAreaInsets();
  const { userDoc, role, logout } = useAuth();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isPraktikan = role === 'praktikan';
  const isAslab = role === 'aslab';
  const roleLabel = getRoleDisplayLabel(role);
  const name =
    userDoc?.nama ?? (isPraktikan ? 'Praktikan' : isAslab ? 'Aslab' : 'Asprak');
  const subInfo = isPraktikan
    ? `Kelas ${userDoc?.kelas ?? '-'}`
    : isAslab
    ? 'Pengelola Lab'
    : 'Asprak Sesi';

  const fullSubInfo = isPraktikan
    ? `Kelas ${userDoc?.kelas ?? '-'}`
    : isAslab
    ? userDoc?.peranLab ?? 'Asisten Laboratorium (Aslab)'
    : userDoc?.peranLab ?? 'Asisten Praktikum (Asprak)';

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
          onPress={() => router.replace(getHomeRouteByRole(role) as Href)}
          accessibilityRole="button"
          accessibilityLabel="PPK LabPortal Beranda">
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>PPK</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>LabPortal</Text>
            {Platform.OS === 'web' && (
              <Text style={styles.brandSubtitle}>Presensi & Manajemen Lab</Text>
            )}
          </View>
        </Pressable>

        {/* Right Group: User Profile Badge & Logout Button */}
        <View style={styles.rightGroup}>
          <View
            style={[
              styles.userPill,
              isPraktikan
                ? styles.userPillPraktikan
                : isAslab
                ? styles.userPillAslab
                : styles.userPillAsisten,
            ]}>
            <View
              style={[
                styles.roleMiniBadge,
                isPraktikan
                  ? styles.roleMiniPraktikan
                  : isAslab
                  ? styles.roleMiniAslab
                  : styles.roleMiniAsisten,
              ]}>
              <Text
                style={[
                  styles.roleMiniText,
                  isPraktikan
                    ? styles.textPraktikan
                    : isAslab
                    ? styles.textAslab
                    : styles.textAsisten,
                ]}>
                {roleLabel}
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
            onPress={() => router.push('/notifikasi' as Href)}
            accessibilityRole="button"
            accessibilityLabel="Buka pusat notifikasi">
            <Text style={styles.logoutBtnText}>Notifikasi</Text>
          </Pressable>

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
            <Text style={styles.summaryMeta}>{fullSubInfo}</Text>
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
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'nowrap',
    gap: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  logoBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#EA580C',
    letterSpacing: 0.5,
  },
  brandTitle: {
    fontSize: Platform.OS === 'web' ? 14 : 11.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 8.5,
    color: '#64748B',
    fontWeight: '500',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 5,
    paddingVertical: 2.5,
    borderRadius: 7,
    borderWidth: 1,
    flexShrink: 1,
    maxWidth: Platform.OS === 'web' ? 260 : 210,
  },
  userPillPraktikan: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  userPillAsisten: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  userPillAslab: {
    backgroundColor: Colors.aslabTint,
    borderColor: Colors.aslabBorder,
  },
  userInfoWrap: {
    gap: 0.5,
    flexShrink: 1,
  },
  userName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
    maxWidth: Platform.OS === 'web' ? 180 : 160,
  },
  userSub: {
    fontSize: 8.5,
    color: '#64748B',
    maxWidth: Platform.OS === 'web' ? 180 : 160,
  },
  roleMiniBadge: {
    paddingHorizontal: 3.5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roleMiniPraktikan: {
    backgroundColor: '#FED7AA',
  },
  roleMiniAsisten: {
    backgroundColor: '#99F6E4',
  },
  roleMiniAslab: {
    backgroundColor: Colors.aslabBorder,
  },
  roleMiniText: {
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  textPraktikan: {
    color: '#9A3412',
  },
  textAsisten: {
    color: '#0F766E',
  },
  textAslab: {
    color: Colors.aslabPrimary,
  },
  logoutBtn: {
    height: 28,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtnText: {
    fontSize: 10.5,
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
