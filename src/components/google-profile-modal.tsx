import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { UserDocument, UserRole, useAuth } from '@/context/auth-context';

interface GoogleProfileModalProps {
  visible: boolean;
  onSuccess: (profile: UserDocument) => void;
  onCancel: () => void;
}

export function GoogleProfileModal({
  visible,
  onSuccess,
  onCancel,
}: GoogleProfileModalProps) {
  if (!visible) {
    return null;
  }

  return <GoogleProfileModalContent onSuccess={onSuccess} onCancel={onCancel} />;
}

function GoogleProfileModalContent({
  onSuccess,
  onCancel,
}: Omit<GoogleProfileModalProps, 'visible'>) {
  const { user, completeGoogleProfile } = useAuth();

  const [nama, setNama] = useState(user?.displayName ?? '');
  const [peran, setPeran] = useState<UserRole>('praktikan');
  const [nim, setNim] = useState('');
  const [kelas, setKelas] = useState<'A' | 'B'>('A');
  const [peranLab, setPeranLab] = useState('Pengampu Lab Komputasi');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isPraktikan = peran === 'praktikan';

  const handleSubmit = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const profile = await completeGoogleProfile(
        nama,
        peran,
        isPraktikan ? nim : undefined,
        isPraktikan ? kelas : undefined,
        !isPraktikan ? peranLab : undefined
      );
      onSuccess(profile);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan profil pengguna.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>● LENGKAPI PROFIL</Text>
            </View>
            <Text style={styles.title}>Konfirmasi Identitas Portal</Text>
            <Text style={styles.subtitle}>
              Akun Google ({user?.email ?? '-'}) baru pertama kali masuk. Pilih peran dan lengkapi data akademik Anda.
            </Text>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Peran Pengguna</Text>
              <View style={styles.roleRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.roleBtn,
                    isPraktikan && styles.roleBtnPraktikan,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setPeran('praktikan')}>
                  <Text
                    style={[
                      styles.roleBtnText,
                      isPraktikan && styles.roleBtnTextPraktikan,
                    ]}>
                    ● Praktikan
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.roleBtn,
                    !isPraktikan && styles.roleBtnAsisten,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setPeran('asisten')}>
                  <Text
                    style={[
                      styles.roleBtnText,
                      !isPraktikan && styles.roleBtnTextAsisten,
                    ]}>
                    ● Asisten Lab
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nama Lengkap</Text>
              <TextInput
                style={styles.input}
                value={nama}
                onChangeText={setNama}
                placeholder="Nama lengkap sesuai KTM/identitas"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {isPraktikan ? (
              <>
                <View style={styles.fieldGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>NIM (14 Digit UNDIP)</Text>
                    <Text style={styles.counterText}>{nim.length}/14 digit</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={nim}
                    onChangeText={(t) => setNim(t.replace(/[^0-9]/g, '').slice(0, 14))}
                    placeholder="24060122130001"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={14}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Kelas Praktikum</Text>
                  <View style={styles.roleRow}>
                    {(['A', 'B'] as const).map((k) => {
                      const active = kelas === k;
                      return (
                        <Pressable
                          key={k}
                          style={({ pressed }) => [
                            styles.kelasBtn,
                            active && styles.kelasBtnActive,
                            pressed && styles.pressed,
                          ]}
                          onPress={() => setKelas(k)}>
                          <Text
                            style={[
                              styles.kelasBtnText,
                              active && styles.kelasBtnTextActive,
                            ]}>
                            Kelas {k}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Peran Laboratorium (Opsional)</Text>
                <TextInput
                  style={styles.input}
                  value={peranLab}
                  onChangeText={setPeranLab}
                  placeholder="Pengampu Lab Komputasi"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
              onPress={onCancel}
              disabled={submitting}>
              <Text style={styles.cancelBtnText}>Batal</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                isPraktikan ? styles.submitBtnPraktikan : styles.submitBtnAsisten,
                pressed && styles.pressed,
                submitting && styles.disabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Simpan & Masuk →</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 22,
  },
  header: {
    marginBottom: 14,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EA580C',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },
  body: {
    marginBottom: 14,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#B91C1C',
    lineHeight: 18,
  },
  fieldGroup: {
    marginBottom: 14,
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  counterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  input: {
    minHeight: 44,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  roleBtnPraktikan: {
    borderColor: '#EA580C',
    backgroundColor: '#FFF7ED',
  },
  roleBtnAsisten: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
  },
  roleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  roleBtnTextPraktikan: {
    color: '#EA580C',
  },
  roleBtnTextAsisten: {
    color: '#0D9488',
  },
  kelasBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kelasBtnActive: {
    borderColor: '#EA580C',
    backgroundColor: '#FFF7ED',
  },
  kelasBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  kelasBtnTextActive: {
    color: '#EA580C',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  submitBtn: {
    flex: 2,
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnPraktikan: {
    backgroundColor: '#EA580C',
  },
  submitBtnAsisten: {
    backgroundColor: '#0D9488',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
});
