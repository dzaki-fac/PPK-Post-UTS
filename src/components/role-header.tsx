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
    ? `NIM: ${currentPraktikan?.nim ?? '-'} • Kelas ${currentPraktikan?.kelas ?? '-'}`
    : 'Pengelola Laboratorium';

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
    <View style={styles.outerContainer}>
      <View
        style={[
          styles.innerContainer,
          {
            paddingTop: Platform.OS === 'web' ? 12 : Math.max(insets.top, 12),
          },
        ]}>
        {/* Left: Back to Home + Brand & Role Badge */}
        <View style={styles.leftCol}>
          <Pressable
            style={({ pressed }) => [
              styles.backHomeBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={handleKembaliKeBeranda}
            accessibilityRole="button"
            accessibilityLabel="Kembali ke Beranda Portal">
            <Text style={styles.backHomeIcon}>←</Text>
            <Text style={styles.backHomeText}>Beranda</Text>
          </Pressable>

          <View style={styles.brandGroup}>
            <View
              style={[
                styles.roleBadge,
                isPraktikan ? styles.rolePraktikan : styles.roleAsisten,
              ]}>
              <Text
                style={[
                  styles.roleText,
                  isPraktikan ? styles.textPraktikan : styles.textAsisten,
                ]}>
                {isPraktikan ? 'MAHASISWA' : 'ASISTEN LAB'}
              </Text>
            </View>
            <Text style={styles.userName} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.userSub} numberOfLines={1}>
              {subInfo}
            </Text>
          </View>
        </View>

        {/* Right: Switch Account Button */}
        <Pressable
          style={({ pressed }) => [
            styles.switchBtn,
            pressed && styles.btnPressed,
          ]}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Ganti akun pengguna">
          <Text style={styles.switchBtnText}>Ganti Akun</Text>
        </Pressable>
      </View>

      {/* Switch Account Modal */}
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
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {isPraktikan ? 'Pilih Akun Praktikan' : 'Pilih Akun Asisten'}
            </Text>
            <Text style={styles.modalSubtitle}>
              Pilih identitas untuk menguji alur presensi dan rekap kehadiran
            </Text>

            {isPraktikan ? (
              <FlatList
                data={allPraktikan}
                keyExtractor={(item) => item.id}
                style={styles.modalList}
                renderItem={({ item }) => {
                  const isSelected = currentPraktikan?.id === item.id;
                  return (
                    <Pressable
                      style={[
                        styles.accountRow,
                        isSelected && styles.accountRowSelected,
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
                          {item.nama.charAt(0)}
                        </Text>
                      </View>
                      <View style={styles.accountInfo}>
                        <Text
                          style={[
                            styles.accountName,
                            isSelected && styles.accountNameSelected,
                          ]}>
                          {item.nama}
                        </Text>
                        <Text style={styles.accountMeta}>
                          NIM: {item.nim} • Kelas {item.kelas}
                        </Text>
                      </View>
                      {isSelected ? (
                        <Text style={styles.checkIcon}>✓</Text>
                      ) : null}
                    </Pressable>
                  );
                }}
              />
            ) : (
              <FlatList
                data={allAsisten}
                keyExtractor={(item) => item.id}
                style={styles.modalList}
                renderItem={({ item }) => {
                  const isSelected = currentAsisten?.id === item.id;
                  return (
                    <Pressable
                      style={[
                        styles.accountRow,
                        isSelected && styles.accountRowSelectedAsisten,
                      ]}
                      onPress={() => handleSelectAsisten(item)}>
                      <View
                        style={[
                          styles.avatar,
                          isSelected && styles.avatarSelectedAsisten,
                        ]}>
                        <Text
                          style={[
                            styles.avatarText,
                            isSelected && styles.avatarTextSelected,
                          ]}>
                          {item.nama.charAt(0)}
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
                          Asisten Pengampu Laboratorium
                        </Text>
                      </View>
                      {isSelected ? (
                        <Text style={styles.checkIconAsisten}>✓</Text>
                      ) : null}
                    </Pressable>
                  );
                }}
              />
            )}

            <View style={styles.modalActionButtons}>
              <Pressable
                style={styles.switchRoleBtn}
                onPress={handleKembaliKeBeranda}>
                <Text style={styles.switchRoleBtnText}>
                  🔄 Ganti Peran / Keluar ke Beranda
                </Text>
              </Pressable>

              <Pressable
                style={styles.closeBtn}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtnText}>Tutup</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    width: '100%',
  },
  innerContainer: {
    maxWidth: 840,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  leftCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backHomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  backHomeIcon: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  backHomeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  brandGroup: {
    flex: 1,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    marginBottom: 3,
  },
  rolePraktikan: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  roleAsisten: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textPraktikan: {
    color: '#EA580C',
  },
  textAsisten: {
    color: '#0D9488',
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  userSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  switchBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  btnPressed: {
    opacity: 0.85,
  },
  switchBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalDismiss: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    maxHeight: '75%',
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 14,
  },
  modalList: {
    marginVertical: 4,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
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
  accountRowSelectedAsisten: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSelected: {
    backgroundColor: '#EA580C',
  },
  avatarSelectedAsisten: {
    backgroundColor: '#0D9488',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  avatarTextSelected: {
    color: '#FFFFFF',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  accountNameSelected: {
    color: '#9A3412',
  },
  accountNameSelectedAsisten: {
    color: '#115E59',
  },
  accountMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  checkIcon: {
    fontSize: 16,
    fontWeight: '800',
    color: '#EA580C',
  },
  checkIconAsisten: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0D9488',
  },
  modalActionButtons: {
    marginTop: 12,
    gap: 8,
  },
  switchRoleBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    alignItems: 'center',
  },
  switchRoleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EA580C',
  },
  closeBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
});
