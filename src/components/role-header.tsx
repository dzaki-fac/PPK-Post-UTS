import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { usePraktikum } from '@/context/praktikum-context';
import { Praktikan } from '@/types/praktikum';

export function RoleHeader() {
  const { role, currentPraktikan, currentAsisten, allPraktikan, setCurrentPraktikan } =
    usePraktikum();
  const [modalVisible, setModalVisible] = useState(false);

  const isPraktikan = role === 'praktikan';
  const name = isPraktikan
    ? currentPraktikan?.nama ?? 'Praktikan'
    : currentAsisten?.nama ?? 'Asisten';
  const subInfo = isPraktikan
    ? `NIM: ${currentPraktikan?.nim ?? '-'} • Kelas ${currentPraktikan?.kelas ?? '-'}`
    : 'Pengelola Sesi Praktikum';

  const handleSelectStudent = (student: Praktikan) => {
    setCurrentPraktikan(student);
    setModalVisible(false);
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.leftCol}>
          <View style={styles.badgeRow}>
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
                {isPraktikan ? 'Mahasiswa / Praktikan' : 'Asisten Praktikum'}
              </Text>
            </View>
          </View>
          <Text style={styles.userName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.userSub} numberOfLines={1}>
            {subInfo}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.switchBtn, pressed && styles.switchBtnPressed]}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Ganti akun praktikan">
          <Text style={styles.switchBtnText}>Ganti Akun</Text>
        </Pressable>
      </View>

      {/* Switch Student Modal */}
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
            <Text style={styles.modalTitle}>Pilih Akun Praktikan</Text>
            <Text style={styles.modalSubtitle}>
              Pilih akun mahasiswa untuk menguji presensi dan riwayat
            </Text>

            <FlatList
              data={allPraktikan}
              keyExtractor={(item) => item.id}
              style={styles.modalList}
              renderItem={({ item }) => {
                const isSelected = currentPraktikan?.id === item.id;
                return (
                  <Pressable
                    style={[
                      styles.studentRow,
                      isSelected && styles.studentRowSelected,
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
                    <View style={styles.studentInfo}>
                      <Text
                        style={[
                          styles.studentName,
                          isSelected && styles.studentNameSelected,
                        ]}>
                        {item.nama}
                      </Text>
                      <Text style={styles.studentMeta}>
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

            <Pressable
              style={styles.closeBtn}
              onPress={() => setModalVisible(false)}>
              <Text style={styles.closeBtnText}>Tutup</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  leftCol: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
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
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  textPraktikan: {
    color: '#EA580C',
  },
  textAsisten: {
    color: '#0D9488',
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  userSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  switchBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  switchBtnPressed: {
    backgroundColor: '#E2E8F0',
  },
  switchBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
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
    fontWeight: '700',
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
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    gap: 12,
  },
  studentRowSelected: {
    borderColor: '#EA580C',
    backgroundColor: '#FFF7ED',
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
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  avatarTextSelected: {
    color: '#FFFFFF',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  studentNameSelected: {
    color: '#9A3412',
  },
  studentMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  checkIcon: {
    fontSize: 16,
    fontWeight: '800',
    color: '#EA580C',
  },
  closeBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
});
