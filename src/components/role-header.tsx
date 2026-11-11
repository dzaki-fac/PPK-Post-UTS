import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePraktikum } from '@/context/praktikum-context';
import { Asisten, Praktikan } from '@/types/praktikum';

export function RoleHeader() {
  const insets = useSafeAreaInsets();
  const {
    role,
    currentPraktikan,
    currentAsisten,
    allPraktikan,
    allAsisten,
    setCurrentPraktikan,
    setCurrentAsisten,
    logout,
  } = usePraktikum();
  const [modalVisible, setModalVisible] = useState(false);

  const isPraktikan = role === 'praktikan';

  const name = isPraktikan
    ? currentPraktikan?.nama ?? 'Praktikan'
    : currentAsisten?.nama ?? 'Asisten';
  const subInfo = isPraktikan
    ? `Kelas ${currentPraktikan?.kelas ?? '-'}`
    : 'Pengampu Lab';

  const handleSelectStudent = (student: Praktikan) => {
    setCurrentPraktikan(student);
    setModalVisible(false);
  };

  const handleSelectAsisten = (asisten: Asisten) => {
    setCurrentAsisten(asisten);
    setModalVisible(false);
  };

  const handleKembaliKeBeranda = () => {
    setModalVisible(false);
    logout();
    router.replace('/');
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
        {/* Brand Group (Clickable to return to portal landing) */}
        <Pressable
          style={({ pressed }) => [styles.brandRow, pressed && styles.btnPressed]}
          onPress={handleKembaliKeBeranda}
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

        {/* Right Group: User Profile Badge & Switch Account Button */}
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
            style={({ pressed }) => [styles.switchBtn, pressed && styles.btnPressed]}
            onPress={() => setModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Ganti akun pengguna">
            <Text style={styles.switchBtnText}>Ganti Akun</Text>
          </Pressable>
        </View>
      </View>

      {/* Switch Account Centered Popup Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalDismiss}
            onPress={() => setModalVisible(false)}
          />
          <View style={styles.modalPopupCard}>
            {/* Modal Header with Close '✕' Button */}
            <View style={styles.modalHeader}>
              <View
                style={[
                  styles.modalIconWrap,
                  isPraktikan ? styles.modalIconPraktikan : styles.modalIconAsisten,
                ]}>
                <Text
                  style={[
                    styles.modalIconText,
                    isPraktikan ? styles.textPraktikan : styles.textAsisten,
                  ]}>
                  {isPraktikan ? 'MHS' : 'AST'}
                </Text>
              </View>
              <View style={styles.modalTitleBlock}>
                <Text style={styles.modalTitle}>
                  {isPraktikan ? 'Pilih Akun Praktikan' : 'Pilih Akun Asisten'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Klik salah satu akun untuk beralih profil
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.closeBtn, pressed && styles.btnPressed]}
                onPress={() => setModalVisible(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Tutup dialog">
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            {/* List of Accounts */}
            {isPraktikan ? (
              <FlatList
                data={allPraktikan}
                keyExtractor={(item) => item.id}
                style={styles.modalList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isSelected = currentPraktikan?.id === item.id;
                  const initials = item.nama
                    .split(' ')
                    .slice(0, 2)
                    .map((w) => w[0]?.toUpperCase() ?? '')
                    .join('');

                  return (
                    <Pressable
                      style={({ pressed }) => [
                        styles.accountRow,
                        isSelected && styles.accountRowSelected,
                        pressed && styles.btnPressed,
                      ]}
                      onPress={() => handleSelectStudent(item)}>
                      <View
                        style={[
                          styles.avatar,
                          isSelected && styles.avatarSelected,
                        ]}>
                        <Text
                          style={[
                            styles.avatarText,
                            isSelected && styles.avatarTextSelected,
                          ]}>
                          {initials}
                        </Text>
                      </View>
                      <View style={styles.accountInfo}>
                        <View style={styles.nameRow}>
                          <Text
                            style={[
                              styles.accountName,
                              isSelected && styles.accountNameSelected,
                            ]}>
                            {item.nama}
                          </Text>
                          <View style={styles.kelasMiniChip}>
                            <Text style={styles.kelasMiniText}>Kelas {item.kelas}</Text>
                          </View>
                        </View>
                        <Text style={styles.accountMeta}>NIM: {item.nim}</Text>
                      </View>
                      {isSelected ? (
                        <View style={styles.activeBadgePraktikan}>
                          <Text style={styles.activeBadgeText}>Aktif</Text>
                        </View>
                      ) : (
                        <Text style={styles.selectArrow}>Pilih →</Text>
                      )}
                    </Pressable>
                  );
                }}
              />
            ) : (
              <FlatList
                data={allAsisten}
                keyExtractor={(item) => item.id}
                style={styles.modalList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isSelected = currentAsisten?.id === item.id;
                  const initials = item.nama
                    .replace(/^Kak\s+/i, '')
                    .split(' ')
                    .slice(0, 2)
                    .map((w) => w[0]?.toUpperCase() ?? '')
                    .join('');

                  return (
                    <Pressable
                      style={({ pressed }) => [
                        styles.accountRow,
                        styles.accountRowAsisten,
                        isSelected && styles.accountRowSelectedAsisten,
                        pressed && styles.btnPressed,
                      ]}
                      onPress={() => handleSelectAsisten(item)}>
                      <View
                        style={[
                          styles.avatar,
                          styles.avatarAsisten,
                          isSelected && styles.avatarSelectedAsisten,
                        ]}>
                        <Text
                          style={[
                            styles.avatarText,
                            styles.avatarTextAsisten,
                            isSelected && styles.avatarTextSelected,
                          ]}>
                          {initials}
                        </Text>
                      </View>
                      <View style={styles.accountInfo}>
                        <Text
                          style={[
                            styles.accountName,
                            isSelected && styles.accountNameSelectedAsisten,
                          ]}>
                          {item.nama}
                        </Text>
                        <Text style={styles.accountMeta}>
                          Pengampu Laboratorium Komputasi
                        </Text>
                      </View>
                      {isSelected ? (
                        <View style={styles.activeBadgeAsisten}>
                          <Text style={styles.activeBadgeText}>Aktif</Text>
                        </View>
                      ) : (
                        <Text style={[styles.selectArrow, { color: '#0D9488' }]}>Pilih →</Text>
                      )}
                    </Pressable>
                  );
                }}
              />
            )}

            {/* Bottom Modal Action: Single Clean Switch Role Card */}
            <View style={styles.modalFooter}>
              <Pressable
                style={({ pressed }) => [
                  styles.btnSwitchRoleCard,
                  pressed && styles.btnPressed,
                ]}
                onPress={handleKembaliKeBeranda}>
                <View style={styles.switchRoleTextWrap}>
                  <Text style={styles.switchRoleTitle}>
                    Ganti Peran ke Portal Utama
                  </Text>
                  <Text style={styles.switchRoleSubtitle}>
                    Keluar dan beralih antara Mahasiswa & Asisten Lab
                  </Text>
                </View>
                <Text style={styles.switchRoleArrow}>→</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    flexWrap: 'wrap',
    gap: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#EA580C',
    letterSpacing: 0.5,
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
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
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: 140,
  },
  userSub: {
    fontSize: 11,
    color: '#64748B',
  },
  roleMiniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleMiniPraktikan: {
    backgroundColor: '#FED7AA',
  },
  roleMiniAsisten: {
    backgroundColor: '#99F6E4',
  },
  roleMiniText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textPraktikan: {
    color: '#9A3412',
  },
  textAsisten: {
    color: '#0F766E',
  },
  switchBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  switchBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  btnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },

  /* Centered Popup Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalDismiss: {
    ...StyleSheet.absoluteFill,
  },
  modalPopupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    maxWidth: 480,
    width: '100%',
    maxHeight: '84%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconPraktikan: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  modalIconAsisten: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  modalIconText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalTitleBlock: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
  },
  modalList: {
    marginVertical: 4,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  accountRowSelected: {
    borderColor: '#EA580C',
    backgroundColor: '#FFF7ED',
  },
  accountRowAsisten: {
    borderColor: '#CCFBF1',
  },
  accountRowSelectedAsisten: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSelected: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  avatarAsisten: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  avatarSelectedAsisten: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EA580C',
  },
  avatarTextAsisten: {
    color: '#0D9488',
  },
  avatarTextSelected: {
    color: '#FFFFFF',
  },
  accountInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  accountNameSelected: {
    color: '#9A3412',
  },
  accountNameSelectedAsisten: {
    color: '#115E59',
  },
  kelasMiniChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  kelasMiniText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  accountMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  activeBadgePraktikan: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#EA580C',
  },
  activeBadgeAsisten: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#0D9488',
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  selectArrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EA580C',
  },
  modalFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  btnSwitchRoleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  switchRoleTextWrap: {
    flex: 1,
  },
  switchRoleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  switchRoleSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  switchRoleArrow: {
    fontSize: 16,
    fontWeight: '800',
    color: '#475569',
  },
});
