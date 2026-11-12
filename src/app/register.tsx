import { Redirect, router, type Href } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleProfileModal } from '@/components/google-profile-modal';
import { UserDocument, UserRole, useAuth } from '@/context/auth-context';

export default function RegisterScreen() {
  const {
    user,
    userDoc,
    loading,
    role,
    needsProfileCompletion,
    register,
    loginWithGoogle,
    logout,
  } = useAuth();

  const [peran, setPeran] = useState<UserRole>('praktikan');
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nim, setNim] = useState('');
  const [kelas, setKelas] = useState<'A' | 'B'>('A');
  const [peranLab, setPeranLab] = useState('Pengampu Lab Komputasi');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!loading && user && userDoc && role) {
    return (
      <Redirect
        href={(role === 'asisten' ? '/asisten/jadwal' : '/praktikan/jadwal') as Href}
      />
    );
  }

  const isPraktikan = peran === 'praktikan';

  const navigateByProfile = (profile: UserDocument) => {
    router.replace(
      (profile.peran === 'asisten' ? '/asisten/jadwal' : '/praktikan/jadwal') as Href
    );
  };

  const handleRegister = async () => {
    setErrorMsg(null);

    if (!nama.trim() || !email.trim() || !password) {
      setErrorMsg('Nama lengkap, email, dan kata sandi wajib diisi.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    if (isPraktikan && !/^\d{14}$/.test(nim)) {
      setErrorMsg('NIM praktikan wajib 14 digit angka (contoh: 24060122130001).');
      return;
    }

    setSubmitting(true);
    try {
      const profile = await register(
        email,
        password,
        nama,
        peran,
        isPraktikan ? nim : undefined,
        isPraktikan ? kelas : undefined,
        !isPraktikan ? peranLab : undefined
      );
      navigateByProfile(profile);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mendaftarkan akun.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleRegister = async () => {
    setErrorMsg(null);
    setGoogleSubmitting(true);
    try {
      const result = await loginWithGoogle();
      if (!result.isNewUser && result.userDoc) {
        navigateByProfile(result.userDoc);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal masuk dengan Akun Google.'
      );
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/login' as Href);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flexOne}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.centerContainer}>
              {/* Breadcrumb Back */}
              <Pressable
                style={({ pressed }) => [styles.backBreadcrumb, pressed && styles.pressed]}
                onPress={handleBackToLogin}
                accessibilityRole="button">
                <Text style={styles.backBreadcrumbText}>
                  ← Kembali ke Halaman Masuk
                </Text>
              </Pressable>

              {/* Register Card */}
              <View style={styles.card}>
                <View style={styles.headerBadgeWrap}>
                  <View
                    style={[
                      styles.roleEyebrow,
                      isPraktikan ? styles.roleEyebrowPraktikan : styles.roleEyebrowAsisten,
                    ]}>
                    <Text
                      style={[
                        styles.roleEyebrowText,
                        isPraktikan ? styles.textPraktikan : styles.textAsisten,
                      ]}>
                      {isPraktikan ? 'REGISTRASI PRAKTIKAN' : 'REGISTRASI ASISTEN LAB'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.cardTitle}>Buat Akun Baru</Text>
                <Text style={styles.cardSubtitle}>
                  Daftarkan akun pribadi Anda untuk mulai menggunakan sistem presensi cloud PPK LabPortal.
                </Text>

                {errorMsg ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                ) : null}

                {/* Role Switcher */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Pilih Peran</Text>
                  <View style={styles.optionRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.roleOptionBtn,
                        isPraktikan && styles.roleOptionPraktikan,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => setPeran('praktikan')}>
                      <Text
                        style={[
                          styles.roleOptionTitle,
                          isPraktikan && styles.textPraktikan,
                        ]}>
                        Praktikan
                      </Text>
                      <Text style={styles.roleOptionMeta}>Mahasiswa peserta</Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.roleOptionBtn,
                        !isPraktikan && styles.roleOptionAsisten,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => setPeran('asisten')}>
                      <Text
                        style={[
                          styles.roleOptionTitle,
                          !isPraktikan && styles.textAsisten,
                        ]}>
                        Asisten Lab
                      </Text>
                      <Text style={styles.roleOptionMeta}>Pengampu sesi</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Nama Lengkap</Text>
                  <TextInput
                    style={styles.input}
                    value={nama}
                    onChangeText={setNama}
                    placeholder="Contoh: Ahmad Fauzan"
                    placeholderTextColor="#94A3B8"
                    editable={!submitting && !googleSubmitting}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Alamat Email</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="nama@students.undip.ac.id"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    editable={!submitting && !googleSubmitting}
                  />
                </View>

                {isPraktikan ? (
                  <>
                    <View style={styles.formGroup}>
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
                        editable={!submitting && !googleSubmitting}
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Kelas Praktikum</Text>
                      <View style={styles.optionRow}>
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
                                  active && styles.textPraktikan,
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
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Peran Laboratorium (Opsional)</Text>
                    <TextInput
                      style={styles.input}
                      value={peranLab}
                      onChangeText={setPeranLab}
                      placeholder="Pengampu Lab Komputasi"
                      placeholderTextColor="#94A3B8"
                      editable={!submitting && !googleSubmitting}
                    />
                  </View>
                )}

                <View style={styles.formGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Kata Sandi</Text>
                    <Pressable
                      onPress={() => setShowPassword((prev) => !prev)}
                      hitSlop={8}>
                      <Text
                        style={[
                          styles.toggleText,
                          !isPraktikan && styles.textAsisten,
                        ]}>
                        {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                      </Text>
                    </Pressable>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Minimal 6 karakter"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!submitting && !googleSubmitting}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Konfirmasi Kata Sandi</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Ulangi kata sandi"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!submitting && !googleSubmitting}
                    onSubmitEditing={handleRegister}
                  />
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    isPraktikan ? styles.primaryBtnPraktikan : styles.primaryBtnAsisten,
                    pressed && styles.pressed,
                    (submitting || googleSubmitting) && styles.disabled,
                  ]}
                  onPress={handleRegister}
                  disabled={submitting || googleSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel="Daftar Akun">
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Daftar Akun →</Text>
                  )}
                </Pressable>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerLabel}>atau</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.googleBtn,
                    pressed && styles.pressed,
                    (submitting || googleSubmitting) && styles.disabled,
                  ]}
                  onPress={handleGoogleRegister}
                  disabled={submitting || googleSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel="Masuk dengan Akun Google">
                  {googleSubmitting ? (
                    <ActivityIndicator color="#0F172A" size="small" />
                  ) : (
                    <>
                      <View style={styles.googleBadge}>
                        <Text style={styles.googleBadgeText}>G</Text>
                      </View>
                      <Text style={styles.googleBtnText}>
                        Masuk dengan Akun Google
                      </Text>
                    </>
                  )}
                </Pressable>

                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>Sudah punya akun? </Text>
                  <Pressable onPress={handleBackToLogin} hitSlop={8}>
                    <Text
                      style={[
                        styles.footerLink,
                        !isPraktikan && styles.textAsisten,
                      ]}>
                      Masuk di sini →
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <GoogleProfileModal
        visible={Boolean(user && needsProfileCompletion)}
        onSuccess={navigateByProfile}
        onCancel={async () => {
          await logout();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    flex: 1,
  },
  flexOne: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingVertical: 24,
  },
  centerContainer: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    gap: 12,
  },
  backBreadcrumb: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  backBreadcrumbText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 22,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerBadgeWrap: {
    marginBottom: 10,
  },
  roleEyebrow: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  roleEyebrowPraktikan: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  roleEyebrowAsisten: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  roleEyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  textPraktikan: {
    color: '#EA580C',
  },
  textAsisten: {
    color: '#0D9488',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#B91C1C',
    lineHeight: 18,
  },
  formGroup: {
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
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EA580C',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleOptionBtn: {
    flex: 1,
    minHeight: 54,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  roleOptionPraktikan: {
    borderColor: '#EA580C',
    backgroundColor: '#FFF7ED',
  },
  roleOptionAsisten: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
  },
  roleOptionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  roleOptionMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
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
    fontSize: 13.5,
    fontWeight: '700',
    color: '#475569',
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
  primaryBtn: {
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnPraktikan: {
    backgroundColor: '#EA580C',
  },
  primaryBtnAsisten: {
    backgroundColor: '#0D9488',
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  googleBtn: {
    minHeight: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  googleBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EA580C',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
});

